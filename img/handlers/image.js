'use strict'

const {
  Rekognition,
  SNS,
  SSM,
} = require('aws-sdk')

const {
  map,
} = require('awaity/esm')

const rekognition = new Rekognition()
const sns = new SNS()
const ssm = new SSM()

const moderate = async (event) => {
  try {
    const Bucket = process.env.SrcBucketName
    const paramParams = {
      Name: process.env.MinConfidenceParamName,
    }
    const minConfidenceObj = await ssm.getParameter(paramParams).promise()
    const MinConfidence = parseInt(minConfidenceObj.Parameter.Value)
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
      const Image = {
        S3Object,
      }
      return {
        Image,
        MinConfidence,
      }
    })
    const res = await map(paramsSet, async (params) => {
      const resp = await rekognition.detectModerationLabels(params).promise()
      resp.Name = params.Image.S3Object.Name
      return resp
    })
    const withLabels = res.filter(resp => resp.ModerationLabels.length !== 0)
    const messageObj = withLabels.map(resp => ({
      Name: resp.Name,
      Labels: resp.ModerationLabels,
    }))
    const TopicArn = process.env.AlertTopicArn
    return await map(messageObj, async (msg) => {
      const pubParams = {
        Message: JSON.stringify(msg),
        TopicArn,  
      }
      return await sns.publish(pubParams).promise()
    })
  } catch (error) {
    throw error
  }
}

module.exports = {
  moderate,
}
