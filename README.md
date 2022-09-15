# Implementing SQS Fifo Queue with lambda in AWS Amplify using Cloudformation.
In this tutorial, we are integrating SQS to send message in to lambda function in an Amplify project using Cloudformation. 

<p float="left">
  <img src="https://www.pnglogos.com/images/other/aws-sqs.svg" width="50">
  <img src="https://cdn.freebiesupply.com/logos/large/2x/aws-lambda-logo-png-transparent.png" width="50">
  <img src="https://www.mbejda.com/content/images/2017/06/54d0e1dfd287c266052be646-1.png" width="60">
  <img src="https://amplify.aws/community/icons/icon-512x512.png?v=160dc82a14880d6cb3fd933c75257e45" width="60">
</p>

# What We'll build:
Integrate Custom Resource (SQS) with amplify such that sending message to queue invokes lambda with the event message in body. 
Receive same payload inside the lambda function.

https://user-images.githubusercontent.com/74547936/146831301-27c3f6eb-c6a3-4d4a-98be-10d6f96aac77.mp4




# Table of Contents

- [Why This tutorial](#why-this-tutorial)
- [Basic Project Setup (from amplify docs):](#basic-project-setup--from-amplify-docs--)
- [Add Lambda function using Amplify CLI:](#add-lambda-function-using-amplify-cli-)
- [Adding the SQS fifo Queue](#adding-the-sqs-fifo-queue)
- [Linking SQS queue with Lambda](#linking-sqs-queue-with-lambda)
  * [Adding Parameter (using value from another stack)](#adding-parameter--using-value-from-another-stack-)
    + [Implicit Way of Adding Parameter:](#implicit-way-of-adding-parameter-)
      - [`**<CATEGORY><RESOURCE_NAME><OUTPUTS_VARIABLE>**`](#----category--resource-name--outputs-variable----)
    + [Explicit Way of Adding Parameter:](#explicit-way-of-adding-parameter-)
  * [Add Queue as Dependency to lambda (resources creation order)](#add-queue-as-dependency-to-lambda--resources-creation-order-)
- [Working Demo](#working-demo)



## Important Tip: 
**If during the tutorial, you do any change in cloudformation, template or paramters file, make sure to `amplify env checkout` before doing `amplify push`. Otherwise, the cli doesn't detect change during `amplify status`**.

# Why This tutorial 
**SQS is not directly generated by the amplify cli like few other services.** e.g we can add a lambda using command
`amplify add function` 

But to add SQS, we **do not have** a command like `amplify add queue` etc.

There are multiple ways to add other resources not supported by CLI as **Custom resources**. 

Amplify provides two major methods to integrate a custom resource in our amplify app. 
1. [Use CDK to add custom AWS resources](https://docs.amplify.aws/cli/custom/cdk/)
2. [Use CloudFormation to add custom AWS resources](https://docs.amplify.aws/cli/custom/cloudformation/)

In the first one, you can write your custom resource as simple as in Javascript which on `cdk synth` will convert to cloudformation. 
In the second, you simply provide a cloudformation which it deploys on amplify push.

**Both of these methods are absolutely great**. **However, In my recent project, I found another way which I'd like to share with you guys. In this method, I created SQS using amplify folder structure and cloudformation without making a seperate folder for custom resources (like in the above methods).**

Didn't find much of it online, so just sharing it here for learning purposes. 

# Basic Project Setup (from amplify docs): 

First we need to have a basic amplify backend initialized.  
In order to do so, complete all steps on [Prerequisites](https://docs.amplify.aws/start/getting-started/installation/q/integration/angular/) and [Set up fullstack project](https://docs.amplify.aws/start/getting-started/setup/q/integration/angular/) to have an empty amplify backend initialized. 

# Add Lambda function using Amplify CLI: 

Now, we can start by adding a lambda function which will be used to poll from the fifo queue. 
You can add lambda by 
`amplify add function`

<img src="https://user-images.githubusercontent.com/74547936/146816159-4480f754-c476-4a8f-9d8f-069930594829.png" width="700">

This will create an AWS lambda function that will be used to process messages from the queue. 

Now we can see a `function handleOrder` is added into `amplify/backend` folder

<img src="https://user-images.githubusercontent.com/74547936/146816210-24fc7008-182e-45c2-951e-4027a2d1c082.png" width="200">

This is present locally, so we need to `amplify push` it so that this lambda is created on the cloud.

<img src="https://user-images.githubusercontent.com/74547936/146816228-673d7b02-77c3-4923-91a8-4c59aeb728f0.png" width="600">


After `push`, you can now go to aws console and check it. (make sure to select your region when viewing since lambda is region based service and it'll be only present in your region)


This `backend` folder containes all resources. So, if we were to add another (custom) resource, we need to create a folder inside it. 

# Adding the SQS fifo Queue
- Create a new folder inside the `backend` folder and name it to `queue`. ('queue' is not a reserved word, you can name anything but you need to update in other files as well -explain later in the tutorial ). **This is Category**
- Create a folder and name it to `orderQueue` (**this is resource (queue)**)
- Any resource folder must have these two files: 
  - `template.yml`
  - `parameters.json`
  
So create these files. 

I'm using `yml` for cloudformation. 
in the resources, add `SQS:Queue` type resource as 
```
Resources:
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      FifoQueue: true
      ContentBasedDeduplication: true
      QueueName:
        Fn::Join:
          - ''
          - - orders-queue-
            - Ref: env
            - .fifo
```
Here, I'm using the First In, First Out (FIFO) queue with `ContentBasedDeduplication` currently on.

This will also dynamically generate queue name based on the runtime environment.
You can read more about intrinsic function [Fn:join from the docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html) 

We also need to attach SQS policy to this queue with permissions to send, receive, delete & more actions as: 
```
SQSPolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      Queues:
        - Ref: OrderQueue
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal: '*'
            Action:
              - SQS:SendMessage
              - SQS:ReceiveMessage
              - SQS:DeleteMessage
              - SQS:GetQueueAttributes
            Resource:
              Fn::GetAtt:
                - OrderQueue
                - Arn       
```

To keep it simple, we're using '*'. This policy allows all principals to perform the listed actions on `OrderQueue`. 
Instead, in a real world application, you should only include those resources or accounts that need to have access on the queue. 


So, now our complete `template.yml` looks like: 

```
AWSTemplateFormatVersion: '2010-09-09'
Description: >-
  {"createdOn":"Windows","createdBy":"Amplify","createdWith":"7.3.6","stackType":"queue-SQS","metadata":{}}
Parameters:
  env:
    Type: String
Resources:
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      FifoQueue: true
      ContentBasedDeduplication: true
      QueueName:
        Fn::Join:
          - ''
          - - orders-queue-
            - Ref: env
            - .fifo
            
  SQSPolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      Queues:
        - Ref: OrderQueue
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal: '*'
            Action:
              - SQS:SendMessage
              - SQS:ReceiveMessage
              - SQS:DeleteMessage
              - SQS:GetQueueAttributes
            Resource:
              Fn::GetAtt:
                - OrderQueue
                - Arn       
Outputs:
  QueueURL:
    Description: URL of new Amazon SQS Queue
    Value:
      Ref: OrderQueue
  QueueARN:
    Description: ARN of new Amazon SQS Queue
    Value:
      Fn::GetAtt:
        - OrderQueue
        - Arn
  QueueName:
    Description: Name new Amazon SQS Queue
    Value:
      Fn::GetAtt:
        - OrderQueue
        - QueueName

```

- Place an empty object in `parameters.json` as:
`{}`

- Include `queue` into your `backend-config` folder. Because if your resource is not listed in `backend-config`, it won't appear in `amplify status` and hence will not be pushed on cloud.
```
{
  "function": {
    "handleOrder": {
      "build": true,
      "providerPlugin": "awscloudformation",
      "service": "Lambda",
    }
  },
  "queue": {
    "ordersQueue": {
      "providerPlugin": "awscloudformation",
      "service": "SQS"
    }
  }
}
```

- Now save the changes
- Let the CLI know about our custom category and resource by checking out the current environment. `amplify env checkout <env-name>`
- Do `amplify push` again to have queue on cloud. 
- We can see our queue on console
 <img src="https://user-images.githubusercontent.com/74547936/146829784-953d4425-5bda-4c65-a96f-b78a49dfa937.png" width="900">
- If everything is pushed on cloud with not issues, you can move to the next part.




# Linking SQS queue with Lambda

Now, we have `queue` and 'handleOrder' on cloud but both are not configured. We it configured such that if SQS gets a message, it is sent to lambda as an event. 
This is a perfect case for Type `EventSourceMapping` which is basically mapping an event from source(kineses, SQS anything that produces event etc) to a lambda function. 

So we add this in the cloudformation of our `handleOrder` function under the `Resources` section.

```
"LambdaFunctionSQSMapping": {
      "Type": "AWS::Lambda::EventSourceMapping",
      "Properties": {
        "BatchSize": 1,
        "Enabled": true,
        "EventSourceArn": {
          "Ref": "queueordersQueueQueueARN"
        },
        "FunctionName": {
          "Ref": "LambdaFunction"
        }
      }
    }
```
file path: `amplify/backend/function/handleOrder/handleOrder-cloudformation-template.json`

Here, Important attributes to consider are: 
- `EventSourceArn` - Its uniquely identifiable number of the source from which the event is going to come. 
- `FunctionName` - The Name of the function that will be called when event the arrives. 

## Adding Parameter (using value from another stack)

Here, we currently don't have queueARN inside this file. We can access this using `parameters` and `Outputs` ability of the stacks. 
We are exporting `QueueARN` from our queue in it's `template.yml`.
There are two ways to use parameters. 
 -  **implicit** - amplify picks automatically if directory structure is followed)
 -  **explicit** - define exactly from which resource, get which value using intrinsic functions.
 
### Implicit Way of Adding Parameter: 

- Include a parameter `queueordersQueueQueueARN` in lambda cloudformation as:
  ```
    "queueordersQueueQueueARN": {
      "Type": "String"
    }
  ```
The parameter name structure is very important as amplify automatically picks it if used right. 

#### `**<CATEGORY><RESOURCE_NAME><OUTPUTS_VARIABLE>**`

**Directory Structure:**
```
amplify 
  ├── backend
  │       ├── function
  │       │      └── handleOrder
  │       ├── queue
  │       │       └── ordersQueue
  │       │               ├── template.yml
  │       │               └── parameters.json
```
example: queueordersQueueQueueARN

### Explicit Way of Adding Parameter: 
  
Along with the implicit way, you also define in `parameters.json` exactly from where you will get this value. 
- Include in file `amplify/backend/function/handleOrder/parameters.json`
```
{
    "queueordersQueueQueueARN": {
        "Fn::GetAtt": ["ordersQueue", "Outputs.QueueARN"]
    }
}
```
Here, `GetAtt` fetches `QueueARN` from resource `ordersQueue` which is being exported from stack using `Outputs`.


## Add Queue as Dependency to lambda (resources creation order)

**In `backend-config`, all resources are listed and generated in parallel if there is no dependency between them.**

If we try to `push` our current app, we will get error: 
`An error occur during the push operation: Template error: instance of Fn:GetAtt references undefined resource ordersQueue`

We are getting this in `parameters.json`, when we are trying to access `QueueARN` from its exports.

orderQueue is `undefined` and accessing one of its exports results in error. 

**Why is orderQueue undefined?**

Because cloud is creating queue & lambda in parallel, but since lambda is dependent on queue (we're using queue's output in lambda), we have to tell cloud that **create lambda only when queue is perfectly created & ready**

We can define the order in which resources will be created on cloud in `backend-config.json` as:
- update the `backend-config.json` as: 
```
{
  "function": {
    "handleOrder": {
      "build": true,
      "providerPlugin": "awscloudformation",
      "service": "Lambda",
      "dependsOn": [
        { 
          "category": "queue",
          "resourceName": "ordersQueue",
          "attributes": ["QueueARN"]
        }
      ]
    }
  },
  "queue": {
    "ordersQueue": {
      "providerPlugin": "awscloudformation",
      "service": "SQS"
    }
  }
}
```
Here, in `dependsOn`, we define that the current resource should not be created unless all resouces in `dependsOn` array are ready since it has dependency. First create dependent resources then create the original resource. 

- Do `amplfiy env checkout <INSERT_YOUR_ENV>`
- Do `amplify push -y`

After a successful push, you'll have everything ready for demo. 




# Working Demo

We can see that sending message to queue invokes lambda with the event message in body. 
- ✅ Send message from SQS.
- ✅ Receive same payload inside the lambda function.

https://user-images.githubusercontent.com/74547936/146826151-cc9d3e8e-9fd6-4f55-ae12-f1245b326e18.mp4




