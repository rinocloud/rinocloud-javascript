import 'superagent-queue'

require('es6-promise').polyfill();

var superagentPromisePlugin = require('superagent-promise-plugin');
var request = superagentPromisePlugin.patch(require('superagent'));
import Evaporate from 'evaporate'

/*
  This is for use with Django - ignore if using with node
*/
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


/*
  If your using with node you need to call

  api.auth('token')
*/
export const auth = (token) => {
  global.token = token
  var end = request.Request.prototype.end;

  request.Request.prototype.end = function(fn) {
    this.set('Authorization', 'Token ' + token);
    return end.call(this, fn);
  };
}

export const set_base = (base) => {
  global.base = base
}

const base = "/api/1/files/"

export const endpoints = {
    get_token:  "/api/1/users/token/",
    get_metadata: base + "get_metadata/",
    children: base + "children/",
    ancestors: base + "ancestors/",
    create: base + "create_folder/",
    create_notebook: base + "create_notebook/",
    create_empty: base + "create_empty/",
    create_object: base + "create_object/",
    upload_multipart: base + "upload_multipart/",
    upload_binary: base + "upload_binary/",
    update_metadata: base + "update_metadata/",
    download: base + "download/",
    del: base + "delete/",
    delete_metadata_field: base + "delete_metadata_field/",
    move: base + "move/",
    copy: base + "copy/",
    search: base + "search/",
    query: base + "query/",
    autocomplete: base + "autocomplete/",
    autocomplete_search: base + "autocomplete_search/",
    autocomplete_values: base + "autocomplete_values/",
    sign_s3: base + "sign_s3/",
    pre_s3_upload: base + "pre_s3_upload/",
    post_s3_upload: base + "post_s3_upload/",
}

export function post(endpoint, data){
  return request
    .post(endpoint)
    .set('X-Requested-With', 'XMLHttpRequest')
    .set('Accept', 'application/json')
    .send(data)
}

export function download(endpoint, data){
  alert('Not implemented.')
}

export function req(){
  return request
}

export function s3post(file, name, progress, complete){
  var _e_ = new Evaporate({
     signerUrl: endpoints.sign_s3,
     aws_key: 'AKIAIMNS62CAOTEN53BA',
     bucket: 'rinocloud',
     cloudfront: true,
     aws_url: 'https://rinocloud.s3.amazonaws.com'
  })

  _e_.add({
     name: name,
     file: file,
     notSignedHeadersAtInitiate: {
        'Cache-Control': 'max-age=3600'
     },
     xAmzHeadersAtInitiate : {
        'x-amz-acl': 'private'
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


export function upload(file, data={}, progress, complete){
    // Upload workflow
    //
    // 1. Upload metadata
    // 2. Upload file to s3
    // 3. Tell metadata object the pointer to s3 file

    const uploadFinished = (id, name) => {
      request
        .post(endpoints.post_s3_upload)
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
      .post(endpoints.pre_s3_upload)
      .send(data)
      .queue('pre_s3_upload')
      .end((err, res) => {
        if(!err) {
          const id = res.body.data.id
          s3post(file, res.body.upload_name, progress, (name) => {
            uploadFinished(id, name)
          })
        }
      })
 }

/*
  User endpoints
*/
export function fetchInvites(){
  return request
  .get('/api/1/users/get_invites/')
  .then(function(response) {
      if (response.status >= 400) {
          throw new Error("Bad response from server");
      }
      return response.body;
  })

}

export function sendInvite(email){
  return request
    .post( '/api/1/users/send_invite/')
    .send({email: email})
    .then(function(response) {
        if (response.status >= 400) {
            throw new Error("Bad response from server");
        }
        return response.body;
    })
}

export function reSendInvite(id){
  return request
    .post( '/api/1/users/re_send_invite/')
    .send({id: id})
    .then(function(response) {
        if (response.status >= 400) {
            throw new Error("Bad response from server");
        }
        return response.body;
    })
}

export function deleteInvite(id){
  return request
    .post( '/api/1/users/delete_invite/')
    .send({id: id})
    .then(function(response) {
        if (response.status >= 400) {
            throw new Error("Bad response from server");
        }
        return response.body;
    })
}
