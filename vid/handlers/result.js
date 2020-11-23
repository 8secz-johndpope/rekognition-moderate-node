'use strict'

const {
  Rekognition,
  SNS,
} = require('aws-sdk')

const rekognition = new Rekognition()
const sns = new SNS()

const get = async (event) => {
  try {
    const payload = JSON.parse(event.Records[0].Sns.Message)
    if (payload.Status === "SUCCEEDED") {
      const params = {
        JobId: payload.JobId,
      }
      const res = await rekognition.getContentModeration(params).promise()
      if (res.ModerationLabels.length !== 0)
      {
        const messageObj = {
          Name: payload.Video.S3ObjectName,
          Labels: res.ModerationLabels,
        }
        const publishParam = {
          Message: JSON.stringify(messageObj),
          TopicArn: process.env.AlertTopicArn
        }
        return await sns.publish(publishParam).promise()
      }
    }
    return
  } catch (error) {
    throw error
  }
}

module.exports = {
  get,
}
