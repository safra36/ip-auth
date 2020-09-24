

const args = process.argv;
const proto = args[2];
const ip = args[3];
const port = args[4];
const key = args[5];

if(proto != undefined)
{
  console.log(`Starting request session for proto ${proto}`);

  const https = require('https')
  const options = {
    hostname: ip,
    port: parseInt(port),
    path: `/key/${key}/proto/${proto}`,
    method: 'GET'
  }




  setInterval(() => {

      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
      const req = https.request(options, res => {
      console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
          process.stdout.write(d)
      })
      })

      req.on('error', error => {
      console.error(error)
      })

      req.end()
      
  }, 5000);
}
else
{
  console.log(`proto ip port key`)
}







































