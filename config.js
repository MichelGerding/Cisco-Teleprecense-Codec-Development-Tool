const SerialPort = require('serialport');
const config = require('./config.json');

const port = new SerialPort(config.com_port, {
    baudRate: 115200
}, (err) => {
    if (err) {
        console.log(err.message)
    }
})

const timer = ms => new Promise(res => setTimeout(res, ms))
const messages = [
    'echo off',
    'xconfiguration Macros AutoStart: On',
    'xconfiguration Macros Mode: On',
    'xconfiguration Macros UnresponsiveTimeout: 5'
];



for (var i = 0; i < messages.length; i++) {
    const message = messages[i]
    port.write(message + '\r\n', (err) => {
        if (err) {
            return console.log(err.message);
        }
        console.log(`Send Message "${message}"`)
    })
}