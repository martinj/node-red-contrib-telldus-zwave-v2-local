const TelldusLocal = require('telldus-local');
var path = require('path');

module.exports = function(RED) {

    function DeviceInfoNode(config) {
        RED.nodes.createNode(this, config);
        this._localId = config.localId;
        this._name = config.name;
        this._gateway = RED.nodes.getNode(config.gateway);
        var node = this;

        if (!validateConfig(node, config))
            return;

        node._configuration = {
                hostname: node._gateway._ip,
                accessToken: node._gateway.credentials.accessToken
            };

        node._telldusLocal = new TelldusLocal(node._configuration);

        node._telldusLocal.getDevice(node._localId)
            .then(device => {
                node._device = device;
                node.status({fill:"green", shape:"ring", text:"Connected"});
            })
            .catch(error => {
                node.status({fill:"red", shape:"ring", text:"Could not connect"});
            });

        node.on('input', async function(msg) {
            if (!node._device) {
                return;
            }

            var info = await node._device.getInfo();
            info._apiData.state = info._apiData.state == 2 ? 'off' : 'on';
            node.send({payload: info._apiData});
        });
    }

    function validateConfig(node, config) {

        node.status({fill:"red", shape:"ring", text:"Not configured"});

        if ((node._localId == undefined || !node._localId.trim()) ||
            (node._gateway == undefined) ||
            (node._gateway._ip == undefined || !node._gateway._ip.trim()) ||
            (node._gateway.credentials.accessToken == undefined || !node._gateway.credentials.accessToken.trim()))
        {
            node.status({fill:"red", shape:"ring", text:"Not configured"});
            return false;
        }

        node.status({fill:"red", shape:"ring", text:"Disconnected"});

        return true;
    }

    RED.nodes.registerType("telldus-deviceinfo", DeviceInfoNode);

    RED.httpAdmin.get('/telldus-local/common', function(request, response) {
        var filename = path.join(__dirname, 'telldus-common.js');
        response.sendFile(filename);
    });
}
