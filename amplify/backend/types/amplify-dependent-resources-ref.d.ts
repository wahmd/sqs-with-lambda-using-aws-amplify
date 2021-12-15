export type AmplifyDependentResourcesAttributes = {
    "function": {
        "handleOrder": {
            "Name": "string",
            "Arn": "string",
            "Region": "string",
            "LambdaExecutionRole": "string"
        }
    },
    "queue": {
        "ordersQueue": {
            "QueueURL": "string",
            "QueueARN": "string",
            "QueueName": "string"
        }
    }
}