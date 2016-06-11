
import * as api from './src/api.js'
api.auth('8186755009251ef0bbb273fbc86d7b9caa228374')
api.setBase('https://rinocloud.com')

api.createObject({name: '123.txt'})
  .then(console.log.bind(console))
  .catch((err)=>{console.log(err.response.body)})
