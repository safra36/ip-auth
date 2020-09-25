# ip-auth
a web api for allowing ips on certain ports using links and UFW on linux, it also comes with a client to automate authentication on servers and clients.

# Installation

- If you are using the server source don't forget to install express using `npm install express`.
- This app works with UFW so install it on your server:
`sudo apt-get install ufw`
`sudo ufw allow ssh`
`sudo ufw enable`
- Run server as ROOT or with sudo to access your UFW firewall.
- Make sure to create server certificates for https (since the server is only https):
` openssl req -nodes -new -x509 -keyout server.key -out server.cert `



# Usage

## With Binaries

Using server binary you don't need any arguments just the regular config.json file should be enough, you can access binaries [here](https://github.com/safra36/ip-auth/releases)

```
{
    "portos":{
        "openvpn":8080      // Define proto name and target port (Here we are allowing our ip for ovpn server running on port 8080)
    },
    "ip":"",        // Your server IP
    "port":3000,        // web service default port
    "key":"",       // Client authentication key
    "timeout":5000,     // How many seconds an ip will be timed out
    "timer":20000       // How often the server check for clients
}
```


Using the client there are several arguments to launch your app with:
- proto: the proto name you defined in protos of your server
- ip: target server IP
- port: target server Port
- key: target server authentication key


## Without binaries

### For Server
There is not much difference, just follow these steps:
- Install express using `npm install express` (required for server)
- Run server/client using `node main.js`


### For Client
- If you want to manually use the link try: `https://IP:PORT/key/YOUR_KEY/proto/YOUR_PROTO`
- If you cannot access your ip directly or want to allow someone's else ip without giving them the key, do it using `https://IP:PORT/key/YOUR_KEY/proto/YOUR_PROTO?ip=1.1.1.1` syntax

