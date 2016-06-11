import 'superagent-queue'
import Evaporate from 'evaporate'
import superagent from 'superagent'
import promisePlugin from 'superagent-promise-plugin'
import fs from 'fs'
import pt from 'path'

var uploader = require('./uploader')
let request = promisePlugin.patch(superagent)

export let log = (s) => {
  console.log(s)
}

try {
  var csrf = document.getElementsByName("csrfmiddlewaretoken")[0].value;
  var end = request.Request.prototype.end;
  request.Request.prototype._end = function(fn) {
    return end.call(this, fn);
  };
  request.Request.prototype.end = function(fn) {
    this.set('X-CSRFToken', csrf);
    return end.call(this, fn);
  }
}
catch (err) {}


const processResponse = (response) => {
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  return response.body;
}

/*
Authentication and host settings
*/

export let config = {
  base: '',
  token: null
}

export const setBase = (base) => {
  config.base = base
}

export const auth = (token) => {

  config.token = token

  var end = request.Request.prototype.end;

  request.Request.prototype.end = function(fn) {
    this.set('Authorization', 'Token ' + token);
    return end.call(this, fn);
  };
}

// FILE API

/*
Creation routes
*/
export function createObject(metadata){
  return request
  .post(config.base + '/api/1/files/create_object/')
  .send(metadata)
  .then(processResponse)
}

export function createFolder(metadata){
  return request
  .post(config.base + '/api/1/files/create_folder/')
  .send(metadata)
  .then(processResponse)
}

export function createNotebook(metadata){
  return request
  .post(config.base + '/api/1/files/create_notebook/')
  .send(metadata)
  .then(processResponse)
}

export function createEmpty(metadata){
  return request
  .post(config.base + '/api/1/files/create_empty/')
  .send(metadata)
  .then(processResponse)
}

/*
Retrieval routes
*/

export function getMetadata(id){
  return request
  .post(config.base + '/api/1/files/get_metadata/')
  .send({id: id})
  .then(processResponse)
}

export function getChildren(id, limit=20, offset=0){
  return request
  .post(config.base + '/api/1/files/children/')
  .send({id: id, limit: limit, offset: offset})
  .then(processResponse)
}

export function getAncestors(id){
  return request
  .post(config.base + '/api/1/files/ancestors/')
  .send({id: id})
  .then(processResponse)
}

/*
Update routes
*/

export function updateMerge(id, metadata){
  metadata["id"] = id

  return request
  .post(config.base + '/api/1/files/update_metadata/')
  .send(metadata)
  .then(processResponse)
}

export function updateOverwrite(id, metadata){
  return request
  .post(config.base + '/api/1/files/update_metadata/')
  .send({id: id, metadata: metadata})
  .then(processResponse)
}

export function deleteMetadataField(id, field){
  return request
  .post(config.base + '/api/1/files/delete_metadata_field/')
  .send({id: id, field: field})
  .then(processResponse)
}

export function deleteObject(id){
  return request
  .post(config.base + '/api/1/files/delete/')
  .send({id: id})
  .then(processResponse)
}

export function moveObject(targetParent, items){
  // targetParent is the id of the new parent
  // items is a list of ids to moveObject
  return request
  .post(config.base + '/api/1/files/delete/')
  .send({
    parent: targetId,
    items: moveIds
  })
  .then(processResponse)
}

/*
Breadcrumbs
*/

export function fetchBreadcrumbs(id){
  return request
  .post(config.base + '/api/1/files/ancestors/')
  .send({id: id})
  .then(processResponse)
}

/*
Invites
*/

export function fetchInvites(){
  return request
  .get(config.base + '/api/1/users/get_invites/')
  .then(processResponse)
}

export function sendInvite(email){
  return request
  .post(config.base + '/api/1/users/send_invite/')
  .send({email: email})
  .then(processResponse)
}

export function reSendInvite(id){
  return request
  .post( '/api/1/users/re_send_invite/')
  .send({id: id})
  .then(processResponse)
}

export function deleteInvite(id){
  return request
  .post(config.base + '/api/1/users/delete_invite/')
  .send({id: id})
  .then(processResponse)
}

/*
Comments
*/

export function fetchComments(objectId){
  return request
  .post(config.base + '/api/1/comments/list_comments/')
  .send({"object_id": objectId})
  .then(processResponse)
}

export function createComment(objectId, value){
  return request
  .post(config.base + '/api/1/comments/create_comment/')
  .send({object_pk: objectId, comment: value})
  .then(processResponse)
}

export function updateComment(commentId, value){
  return request
  .post(config.base + '/api/1/comments/update_comment/')
  .send({id: commentId, comment: value})
  .then(processResponse)
}

export function deleteComment(commentId){
  return request
  .post(config.base + '/api/1/comments/delete_comment/')
  .send({id: commentId})
  .then(processResponse)
}


/*
Query
*/

export function query(query, limit=20, offset=0){
  return request
  .post(config.base + '/api/1/files/query/')
  .send({
    query: query,
    limit: limit,
    offset: offset
  })
  .then(processResponse)
}

export function autocompleteQuery(){
  return request
  .post(config.base + '/api/1/files/autocomplete_search/')
  .then(processResponse)
}

export function autocompleteValues(field){
  return request
  .post(config.base + '/api/1/files/autocomplete_values/')
  .send({field: field})
  .then(processResponse)
}


/*
Uploading routes

Currently we only support basic multiPartUpload for node.js

- `multiPartUpload(path, data={}, progress, complete)`
path: file path
data: object which contains metadata (must at least have name)
progress: gets called with object containign loaded and total
complete: called with err, res when upload is finished

example:
```
const progress = (e) => {
  console.log('Uploaded ' + e.loaded + '/' + e.total )
}

const complete = (err, response) => {
  console.log(response.body)
}

api.multiPartUpload('./test.txt', {name:"example/test.txt"}, progress, complete)
```

- `s3uploadBrowser(file, data={}, progress, complete)`
file: html5 file object
data: object which contains metadata (must at least have name)
progress: gets called with object containign loaded and total
complete: called with err, res when upload is finished

- `s3uploadElectron(path, data={}, progress, complete)`
path: path to file
data: object which contains metadata (must at least have name)
progress: gets called with object containign loaded and total
complete: called with err, res when upload is finished

*/

var File = function(path){
  /*
  Super basic polyfill of hmtl5 file object, used by the electron uploader
  */
  this.name = pt.basename(path)
  const stats = fs.statSync(path)
  this.size = stats["size"]

  this.buff = fs.readFileSync(path)

  this.slice = function(from_byte, to_byte){
    return this.buff.slice(from_byte, to_byte)
  }.bind(this)

  return this
}

export function s3postBrowser(file, name, progress, complete){
  const evap = new Evaporate({
    signerUrl: config.base + '/api/1/files/sign_s3/',
    aws_key: 'AKIAIMNS62CAOTEN53BA',
    bucket: 'rinocloud',
    cloudfront: true,
    aws_url: 'https://rinocloud.s3.amazonaws.com'
  })

  evap.add({
    name: name,
    file: file,
    notSignedHeadersAtInitiate: {
      'Cache-Control': 'max-age=3600'
    },
    xAmzHeadersAtInitiate : {
      'x-amz-acl': 'private'
    },
    signHeaders: {
      'Authorization': 'Token ' + config.token
    },
    beforeSigner: function(xhr) {
      var requestDate = (new Date()).toISOString();
      xhr.setRequestHeader('Request-Header', requestDate);
    },
    complete: () => {
      complete(name)
    },
    progress: progress
  });
}

export function s3postElectron(file, name, progress, complete) {

  var up = new uploader({
    auth_url: config.base + '/api/1/files/sign_s3/',
    auth_url_headers:{
      'Authorization': 'Token ' + config.token
    },
    file_name: name,
    file: file,
    bucket: 'rinocloud',
    aws_url: 'https://rinocloud.s3.amazonaws.com',
    aws_key_id: 'AKIAIMNS62CAOTEN53BA',
    on_multipart_upload_complete: () => {
      complete(name, null)
    },
    on_auth_error: function(xhr){
      complete(null, xhr)
    },
    on_network_error: function(xhr){
      complete(null, 'Network error')
    },
    on_non_200_error: function(xhr){
      complete(null, xhr.statusText)
    },
    on_abort: function(xhr){
      complete(null, xhr.statusText)
    },
    on_complete_multipart_error: (xhr)=>{
      complete(null, xhr.statusText)
    },
    on_send_part_error: (xhr)=>{
      complete(null, xhr.statusText)
    },
    on_absence_upload_id_error: (xhr)=>{
      complete(null, xhr.statusText)
    },
    on_getting_upload_id_error: function(xhr){
      complete(null, xhr.statusText)
    },
    on_progress: progress
  })

  up.init_multipart_upload()
}

export function s3uploadBrowser(file, data={}, progress, complete){
  /*
  Does a direct s3 upload from the browser
  */
  const uploadFinished = (id, name) => {
    request
    .post(config.base + '/api/1/files/post_s3_upload/')
    .send({name: name, id: id})
    .end((err, res) => {
      complete(err, res)
    })
  }

  let name = file.name
  if (file.hasOwnProperty('fullPath')) name = file.fullPath
  data["size"] = file.size
  data["name"] = name
  request
  .post(config.base + '/api/1/files/pre_s3_upload/')
  .send(data)
  .queue('pre_s3_upload')
  .end((err, res) => {
    if(!err) {
      const id = res.body.data.id
      s3postBrowser(file, res.body.upload_name, progress, (name) => {
        uploadFinished(id, name)
      })
    }
  })
}

export function s3uploadElectron(path, data={}, progress, complete){
  /*
  Does a direct s3 upload from electron.js takes a pure path as argument
  not a html5 file object

  It creates its own html5 file polyfill
  */

  var file = new File(path)
  const uploadFinished = (id, name, err) => {

    if(err !== null) return complete(err, null)

    request
    .post(config.base + '/api/1/files/post_s3_upload/')
    .send({name: name, id: id})
    .end((err, res) => {
      complete(err, res)
    })
  }

  let name = file.name
  if (file.hasOwnProperty('fullPath')) name = file.fullPath

  data["size"] = file.size
  data["name"] = name
  request
  .post(config.base + '/api/1/files/pre_s3_upload/')
  .send(data)
  .queue('pre_s3_upload')
  .end((err, res) => {
    if(!err) {
      s3postElectron(file, res.body.upload_name, progress, uploadFinished.bind(null, res.body.data.id))
    }
    else{
      complete(err, res)
    }
  })

}

export function multiPartUpload(path, data={}, progress, complete){
  /*
  Does a multipart upload direct to rinocloud.
  Doesnt handle large files. Only <50mb
  */
  return request
  .post(config.base + '/api/1/files/upload_multipart/')
  .queue('upload')
  .attach('file', path)
  .field('json', JSON.stringify(data))
  // .field('json', data)
  .on('progress', progress)
  .end(complete)
}
