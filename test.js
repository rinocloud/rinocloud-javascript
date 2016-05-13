
import * as api from './api.js'

api.auth('651ae65b9d5106e53106fbb7f525218b7b2e1456')
api.setBase('http://localhost:8000')

/*
  Upload example
*/

// const progress = (e) => {
//   console.log('Uploaded ' + e.loaded + '/' + e.total )
// }
//
// const complete = (err, response) => {
//   console.log(response.body)
// }
//
// api.upload('./test.txt', {name:"example/test.txt"}, progress, complete)


api
  .fetchBreadcrumbs(1325)
  .then((payload, err) => {
    console.log(payload, err)
  })
  .catch((err) => {
    console.log(err)
  })
