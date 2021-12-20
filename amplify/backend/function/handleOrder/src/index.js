

exports.handler = async (event) => {
    console.log('Event received: ', JSON.stringify(event, null, 2))
    console.log('Lambda ended');
};
