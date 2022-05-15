'use strict';

const AWS = require('aws-sdk');
const Logs = new AWS.CloudWatchLogs();

// rate limit is 5 calls/sec. so sleep 200sec
// https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html
const sleep = () => new Promise((resolve) => setTimeout(resolve, 200));

module.exports.main = async (event) => {
    const now = Date.now();
    const threshold = 7 * 60 * 60 * 24 * 1000;

    let cnt = 0;
    let groups;
    groups = await Logs.describeLogGroups({}).promise();

    while (1) {
        for (const log of groups.logGroups) {
            let streams;
            streams = await Logs.describeLogStreams({ logGroupName: log.logGroupName }).promise();

            while (1) {
                for (const stream of streams.logStreams) {
                    if (stream.storedBytes === 0 && (now - stream.lastEventTimestamp) > threshold) {
                        console.log("DELETE", ++cnt, log.logGroupName, stream.logStreamName);
                        await Logs.deleteLogStream({ logGroupName: log.logGroupName, logStreamName: stream.logStreamName }).promise();
                        await sleep();
                    }
                }

                if (streams.nextToken) {
                    console.log("FETCH stream");
                    streams = await Logs.describeLogStreams({ logGroupName: log.logGroupName, nextToken: streams.nextToken }).promise();
                    await sleep();
                } else {
                    break;
                }
            }
        }

        if (groups.nextToken) {
            console.log("FETCH group");
            groups = await Logs.describeLogGroups({ nextToken }).promise();
        } else {
            break;
        }
    }

    return "OK";
};
