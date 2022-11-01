import {Dropbox, DropboxResponse, DropboxResponseError, files} from 'dropbox'
import fs from 'fs'
import * as core from '@actions/core'
import {create} from '@actions/glob'

const accessToken = core.getInput('DROPBOX_ACCESS_TOKEN')
const secret = core.getInput('DROPBOX_SECRET')
const globSource = core.getInput('GLOB')
const dropboxPathPrefix = core.getInput('DROPBOX_DESTINATION_PATH_PREFIX')
const isDebug = core.getInput('DEBUG')
const fileWriteMode = core.getInput('FILE_WRITE_MODE')

const dropbox = new Dropbox({accessToken, clientSecret: secret})

let parsedFileWriteMode: files.WriteMode
if (fileWriteMode === 'overwrite') {
  parsedFileWriteMode = {'.tag': 'overwrite'}
} else {
  parsedFileWriteMode = {'.tag': 'add'}
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function uploadFile(filePath: string) {
  const file = fs.readFileSync(filePath)
  const destinationPath = `${dropboxPathPrefix}${filePath}`
  if (isDebug) console.log('uploaded file to Dropbox at: ', destinationPath)
  let max_retry = 5
  let retry = 0
  let wait = 0
  while (1) {
    try {
      return await dropbox.filesUpload({
        path: destinationPath,
        contents: file,
        mode: parsedFileWriteMode,
      })
    } catch (err) {
      let error =
        err as DropboxResponseError<files.WriteErrorTooManyWriteOperations>
      if (error?.error?.['.tag'] === 'too_many_write_operations') {
        if (retry < max_retry) {
          wait = error.headers['Retry-After']
          console.log(
            'Too many write operations, retrying in ',
            delay,
            ' seconds',
          )
          await delay(wait * 1000)
          retry += 1
        } else {
          throw err
        }
      } else {
        throw err
      }
    }
  }
}

async function run() {
  const files: DropboxResponse<files.FileMetadata>[] = []
  const source = globSource.split(',').join('\n')
  const globber = await create(source)
  for await (const file of globber.globGenerator()) {
    try {
      const res = await uploadFile(file)
      if (res) {
        files.push()
      }
    } catch (err) {
      const error = err as Error
      console.error('error', err)
      core.setFailed(error)
    }
  }
  console.log('Uploaded files', files)
}

run().catch((err) => {
  const error = err as Error
  console.error('error', err)
  core.setFailed(error)
})
