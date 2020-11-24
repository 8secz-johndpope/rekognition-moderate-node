'use strict'

const {
  Rekognition,
  SSM,
} = require('aws-sdk')

const {
  map,
} = require('awaity/esm')

const rekognition = new Rekognition()
const ssm = new SSM()

const moderate = async (event) => {
  try {
    const Bucket = process.env.SrcBucketName
    const RoleArn = process.env.ResultRoleArn
    const SNSTopicArn = process.env.ResultTopicArn
    const paramParams = {
      Name: process.env.MinConfidenceParamName,
    }
    const minConfidenceObj = await ssm.getParameter(paramParams).promise()
    const MinConfidence = parseFloat(minConfidenceObj.Parameter.Value)
    const records = event.Records.reduce((bodyRecords, record) => {
      const body = JSON.parse(record.body)
      return bodyRecords.concat(body.Records || [])
    }, [])
    const keys = records.map(record => record.s3.object.key)
    const paramsSet = keys.map(key => {
      const S3Object = {
        Bucket,
        Name: key,
      }
      const Video = {
        S3Object,
      }
      const NotificationChannel = {
        RoleArn,
        SNSTopicArn,
      }
      return {
        NotificationChannel,
        Video,
        MinConfidence,
      }
    })
    return await map(paramsSet, params => rekognition.startContentModeration(params).promise())
  } catch (error) {
    throw error
  }
}

module.exports = {
  moderate,
}
