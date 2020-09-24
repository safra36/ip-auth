const { exec } = require("child_process");
const express = require('express')
var Configurations = undefined
var https = require('https')
var fs = require('fs')
const app = express()
// const port = Configurations.port;
var port = undefined;

var AuthenticatedIps = [];


/* const ProtocolsPorts = {
    shadowsocks1:60012,
    shadowsocks2:60013,
    mtproto:5555
} */

// const ProtocolsPorts = Configurations.portos;
var ProtocolsPorts = undefined;


if (fs.existsSync('./config.json')) 
{
    console.log(`Reading Config.json ...`)

    fs.readFile('./config.json', 'utf8', function (err,data) {
        if (err) 
        {
            console.log(`Error reading config file ...`)
            console.log(`Error: ${err}`)
        }
        else
        {
            Configurations = JSON.parse(data);
            console.log(`Configurations Loaded.`)

            port = Configurations.port;
            ProtocolsPorts = Configurations.portos;

            console.log(`Starting server in 5 seconds ...`)
            setTimeout(() => {

                GetUFWListOfAnyIP((Indexes) => {

                    for(const index of Indexes)
                    {
                        SetUFWRemoveIndex(index);
                        console.log(`Cleaned UFW Index: ${index}.`)
                    }
                
                    
                    main();
                
                }, () => {
                
                    console.log(`Could not clear last ips, app is not running.`)
                
                })

            }, 5000);
        }
      });

}
else
{
    console.log(`Config file not found, bot cannot be started.`)
}



function main()
{
    https.createServer({
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
      }, app)
      .listen(port, Configurations.ip, function () {
        console.log(`Running Firewall Manager on port 3000.`)
    })
    
    app.get('/', (req, res) => {
        console.log(req.ip)
    })
      
    
    app.get('/key/:key/proto/:proto/', (req, res) => {
    
        const requestParams = req.params;
        const requestedIp = req.query.ip;
        
        if(requestParams.key == Configurations.key)
        {
            if(ProtocolsPorts[requestParams.proto] != undefined)
            {
    
                if(req.query.ip == undefined)
                {
                    for(ipObject of AuthenticatedIps)
                    {
                        if(ipObject.ip == req.ip && ipObject.port == ProtocolsPorts[requestParams.proto])
                        {
                            res.json({
                                status:true,
                                message:`IP Re-Authenticated!`
                            })
    
                            ipObject.time = new Date().getTime();
                            AuthenticatedIps[AuthenticatedIps.indexOf(ipObject)] = ipObject;
    
                            return;
                        }
                    }
    
                    SetUFWAllowIPOnPort(req.ip, ProtocolsPorts[requestParams.proto], () => {
    
                        AuthenticatedIps.push({
                            ip:req.ip,
                            time:new Date().getTime(),
                            port:ProtocolsPorts[requestParams.proto]
                        })
            
                        res.json({
                            status:true,
                            message:`Your IP has been authenticated for ${requestParams.proto} Protocol (${req.ip})`,
                            proto:requestParams.proto,
                            port:ProtocolsPorts[requestParams.proto]
                        })
        
                    }, (error) => {
        
                        console.log(`ERROR: ${error}`)
                        res.json({
                            status:false,
                            message:`There was an error allowing your ip, please contact administrator!`
                        })
        
                    })
                }
                else
                {
    
                    for(ipObject of AuthenticatedIps)
                    {
                        if(ipObject.ip == requestedIp && ipObject.port == ProtocolsPorts[requestParams.proto])
                        {
                            res.json({
                                status:true,
                                message:`IP Re-Authenticated!`
                            })
    
                            ipObject.time = new Date().getTime();
                            AuthenticatedIps[AuthenticatedIps.indexOf(ipObject)] = ipObject;
    
                            return;
                        }
                    }
    
                    SetUFWAllowIPOnPort(requestedIp, ProtocolsPorts[requestParams.proto], () => {
    
                        AuthenticatedIps.push({
                            ip:requestedIp,
                            time:new Date().getTime(),
                            port:ProtocolsPorts[requestParams.proto]
                        })
            
                        res.json({
                            status:true,
                            message:`Your IP has been authenticated for ${requestParams.proto} Protocol (${requestedIp})`,
                            proto:requestParams.proto,
                            port:ProtocolsPorts[requestParams.proto]
                        })
        
                    }, (error) => {
        
                        console.log(`ERROR: ${error}`)
                        res.json({
                            status:false,
                            message:`There was an error allowing your ip, please contact administrator!`
                        })
        
                    })
                }
    
                
    
    
                
                
                
            }
            else
            {
                res.json({
                    status:false,
                    message:`Unsupported protocol`
                })
            }
            
        }
        else
        {
            res.json({
                status:false,
                message:`Invalid key has been requested.`
            })
        }
    
    })






    setInterval(() => {

        try
        {
            console.log(`Checking IP addresses ...`)
            // console.log(JSON.stringify(AuthenticatedIps));
    
            for(var i = AuthenticatedIps.length;i > 0; i--)
            {
                var ipObject = AuthenticatedIps[i-1];
                var currentTime = new Date().getTime();
    
                console.log(`Checking ip: ${ipObject.ip}, port: ${ipObject.port}`)
    
                if((currentTime - ipObject.time) > Configurations.timeout)
                {
                    console.log(`Time for ${ipObject.ip} has been exceeded, remove it's ip from allowed list ...`);
                    SetUFWRemoveAllowedIP(ipObject.ip, ipObject.port);
                    AuthenticatedIps.splice(i-1, 1);
                }
                else
                {
                    console.log(`Data ${ipObject.ip}:${ipObject.port} is okay to stay, verifying if it exists on the firewall or not ...`)

                    GetUFWIndexOfIPPort(ipObject.ip, ipObject.port, () => {

                        console.log(`Verification Success!`)

                    }, () => {

                        console.log(`Verification Failed! the ip is no longer allowed on firewall for some reason, re-adding the ip ...`)

                        SetUFWAllowIPOnPort(ipObject.ip, ipObject.port, () => {

                            console.log(`IP Re-Allowed!`)

                        }, (error) => {

                            console.log(`IP could not be re-allowed: ${error}`)
                        })

                    })

                }
            }
        }
        catch(e)
        {
            console.log(e);
        }
        
    }, Configurations.timer);
}


SetUFWAllowIPOnPort = (ip, port, trueCallBack, falseCallback) => {

    const command = `ufw allow from ${ip} to any port ${port}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            falseCallback(error.message)
            return;
        }
        if (stderr) {
            falseCallback(stderr)
            return;
        }

        trueCallBack();
    
    });


}


SetUFWRemoveAllowedIP = (ip, port) => {
    
    GetUFWIndexOfIPPort(ip, port, (Indexs) => {

        console.log(Indexs);

        for(const index of Indexs)
        {
            const command = `ufw --force delete ${index}`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.log(error.message)
                    return;
                }
                if (stderr) {
                    console.log(stderr)
                    return;
                }

                console.log(stdout);
            
            });
        }


    }, () => {

        console.log(`Could not get indexses of IP`)

    })


}


SetUFWRemoveIndex = (index) => {

    const command = `ufw --force delete ${index}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(error.message)
            return;
        }
        if (stderr) {
            console.log(stderr)
            return;
        }

        console.log(stdout);
    
    });

}

GetUFWStatusObject = (trueCallBack, falseCallback) => {

    exec("ufw status", (error, stdout, stderr) => {
        if (error) {
            falseCallback(error.message)
            return;
        }
        if (stderr) {
            falseCallback(stderr)
            return;
        }
    
        var lineValidator = [];
        
        var lines = stdout.split('\n');
        for(const line of lines)
        {
            // console.log(`line: ${line}`)
            lineValidator.push({
                value:line,
                index:lines.indexOf(line)
            })
            
        }

        trueCallBack(lineValidator);
    
    });

}


GetUFWIndexOfIp = (ip, trueCallBack, falseCallback) => {

    GetUFWStatusObject((UFWStatusObject) => {
        
        var ReturnArray = [];

        for(const lineObject of UFWStatusObject)
        {
            if(lineObject.value.includes(ip))
            {
                console.log(`Line ${lineObject.index} include the value! which will be UFW index of ${lineObject.index - 3}`)
                ReturnArray.push(lineObject.index - 3)
                
            }
        }

        trueCallBack(ReturnArray);

    }, () => {

        falseCallback();

    })

}

GetUFWIndexsOfPort = (port, trueCallBack, falseCallback) => {

    GetUFWStatusObject((UFWStatusObject) => {
        
        var ReturnArray = [];

        for(const lineObject of UFWStatusObject)
        {
            if(lineObject.value.includes(port))
            {
                console.log(`Line ${lineObject.index} include the value! which will be UFW index of ${lineObject.index - 3}`)
                ReturnArray.push(lineObject.index - 3)
                
            }
        }

        trueCallBack(ReturnArray);

    }, () => {

        falseCallback();

    })

}


GetUFWIndexOfIPPort = (ip, port, trueCallBack, falseCallback) => {

    GetUFWStatusObject((UFWStatusObject) => {
        
        var ReturnArray = [];

        for(const lineObject of UFWStatusObject)
        {
            if(lineObject.value.includes(ip) && lineObject.value.includes(port))
            {
                console.log(`Line ${lineObject.index} include the value! which will be UFW index of ${lineObject.index - 3}`)
                ReturnArray.push(lineObject.index - 3)
                
            }
        }

        trueCallBack(ReturnArray);

    }, () => {

        falseCallback();

    })
    
}


GetIPRegex = () => {

    return /(\d*\.\d*\.\d*\.\d*)/gm;

}

GetUFWListOfAnyIP = (trueCallBack, falseCallback) => {

    GetUFWStatusObject((UFWStatusObject) => {
        
        // const IPRegexFilter = /(\d*\.\d*\.\d*\.\d*)/gm;
        var ReturnArray = [];

        for(const lineObject of UFWStatusObject)
        {

            if(GetIPRegex().test(lineObject.value))
            {
                ReturnArray.push(lineObject.index - 3)
                console.log(`UFW Index: ${lineObject.index - 3} contains an ip.`)
                // console.log(`${lineObject}`)
            }
        }

        trueCallBack(ReturnArray);

    }, () => {

        falseCallback();

    })

}

