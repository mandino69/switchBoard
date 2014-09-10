/*jslint white: true */
/*global State, module, require, console */

/**
 * Copyright (c) 2014 markewest@gmail.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

module.exports = (function () {
  'use strict';

  var Socket = null;

  /**
   * @author markewest@gmail.com
   * @fileoverview Basic control of Denon x4000 Receiver
   * @requires net
   */
  return {
    version : 20140825,

    inputs : ['command', 'list'],

    /**
     * Whitelist of available key codes to use.
     */
    keymap : ['POWER_STATUS', 'POWERON', 'POWEROFF', 'VOL_STATUS' ,'VOLUP', 'VOLDOWN', 'MUTE_STATUS', 'MUTE', 'UNMUTE', 'INPUT_STATUS', 'INPUT_BLURAY', 'INPUT_MPLAYER', 'INPUT_CD', 'INPUT_NETWORK', 'INPUT_TV', 'INPUT_GAME', 'MENU_STATUS', 'MENU', 'MENU_UP', 'MENU_DOWN', 'MENU_LEFT', 'MENU_RIGHT', 'MENU_ENTER', 'MENU_RETURN', 'SOUND_STATUS', 'SOUND_MOVIE', 'SOUND_MCHSTEREO', 'SOUND_PURE', 'ZONE1_STATUS', 'ZONE1_ON', 'ZONE1_OFF', 'ZONE2_STATUS', 'ZONE2_ON', 'ZONE2_VOL_UP', 'ZONE2_VOL_DOWN', 'ZONE2_OFF', 'ZONE3_STATUS', 'ZONE3_ON', 'ZONE3_VOL_UP', 'ZONE3_VOL_DOWN', 'ZONE3_OFF'],

    /**
     * Map inputted commands to the values the device or API is expecting.
     */
    hashTable : { 'POWER_STATUS'    : 'PW?',
                  'POWERON'         : 'PWON',
                  'POWEROFF'        : 'PWSTANDBY',
                  'VOL_STATUS'      : 'MV?',
                  'VOLUP'           : 'MVUP',
                  'VOLDOWN'         : 'MVDOWN',
                  'MUTE_STATUS'     : 'MU?',
                  'MUTE'            : 'MUON',
                  'UNMUTE'          : 'MUOFF',
                  'INPUT_STATUS'    : 'SI?',
                  'INPUT_BLURAY'    : 'SIBD',
                  'INPUT_MPLAYER'   : 'SIMPLAY',
                  'INPUT_CD'        : 'SICD',
                  'INPUT_NETWORK'   : 'SINET',
                  'INPUT_TV'        : 'SISAT/CBL',
                  'INPUT_GAME'      : 'SIGAME',
                  'MENU_STATUS'     : 'MNMEN?',
                  'MENU'            : 'MNMEN ON',
                  'MENU_UP'         : 'MNCUP',
                  'MENU_DOWN'       : 'MNCDN',
                  'MENU_LEFT'       : 'MNCLT',
                  'MENU_RIGHT'      : 'MNCRT',
                  'MENU_ENTER'      : 'MNENT',
                  'MENU_RETURN'     : 'MNRTN',
                  'SOUND_STATUS'    : 'MS?',
                  'SOUND_MOVIE'     : 'MSMOVIE',
                  'SOUND_MCHSTEREO' : 'MSMCH STEREO',
                  'SOUND_PURE'      : 'MSPURE DIRECT',
                  'ZONE1_STATUS'    : 'ZM?',
                  'ZONE1_ON'        : 'ZMON',
                  'ZONE1_OFF'       : 'ZMOFF',
                  'ZONE2_STATUS'    : 'Z2?',
                  'ZONE2_ON'        : 'Z2ON',
                  'ZONE2_VOL_UP'    : 'Z2UP',
                  'ZONE2_VOL_DOWN'  : 'Z3DOWN',
                  'ZONE2_OFF'       : 'Z2OFF',
                  'ZONE3_STATUS'    : 'Z3?',
                  'ZONE3_ON'        : 'Z3ON',
                  'ZONE3_VOL_UP'    : 'Z3UP',
                  'ZONE3_VOL_DOWN'  : 'Z3DOWN',
                  'ZONE3_OFF'       : 'Z3OFF'
    },

    /**
     * Prepares and calls send() to request the current state.
     */
    state : function (controller, config, callback, count) {
      var deviceState    = require(__dirname + '/../lib/deviceState'),
          that           = this,
          denonState     = deviceState.getDeviceState(config.deviceId),
          denon          = { device : {}, config : {} },
          statusCommands = ['VOL_STATUS', 'INPUT_STATUS', 'ZONE3_STATUS'];
          count          = count || 0;

      if(typeof denonState === 'undefined') {
        denonState = { value : { ZONE1 : {}, ZONE2 : {}, ZONE3 : {} } };
      }

      callback      = callback || function() {};
      denon.command = statusCommands[count];

      denon.callback = function (err, reply) {
        var rex = '';

        if(reply) {
          if(rex = reply.toString().match(/(MV)([0-9]+)\r/)) {
            denonState.value.ZONE1.volume = rex[2];
          }

          else if(rex = reply.toString().match(/(SI)([A-Z]+)\r/)) {
            denonState.value.ZONE1.input = rex[2];
          }

          else if(rex = reply.toString().match(/(Z3)(ON|OFF)\r/)) {
            denonState.value.ZONE3.power = rex[2];
          }

          else if(rex = reply.toString().match(/(Z3)([0-9]+)\r/)) {
            denonState.value.ZONE3.volume = rex[2];
          }
        }

        else {
          callback(denon.device.deviceId, 'err');
        }

        if(count === statusCommands.length) {
          callback(denon.device.deviceId, null, 'ok', denonState);
        }

        else {
          that.state(controller, config, callback, (count += 1));
        }
      };

      this.send(denon);
    },

    /**
     * Grab the latest state as soon as SwitchBoard starts up.
     */
    init : function (controller) {
      var runCommand = require(__dirname + '/../lib/runCommand');

      runCommand.runCommand(controller.config.deviceId, 'list', controller.config.deviceId);
    },

    send : function (config) {
      var net    = require('net'),
          denon  = {};

      denon.deviceIp   = config.device.deviceIp;
      denon.timeout    = config.device.localTimeout     || config.config.localTimeout;
      denon.command    = this.hashTable[config.command] || '';
      denon.devicePort = config.devicePort              || 23;
      denon.callback   = config.callback                || function () {};

      if((Socket) && (denon.command)) {
        if((denon.command !== 'state') && (denon.command !== 'list')) {
          Socket.write(denon.command + "\r");
        }

        denon.callback(null, 'ok');
      }

      else if(denon.command === 'list') {
        this.state({}, denon, denon.callback);
      }

      else if(denon.command) {
        Socket = new net.Socket();

        Socket.connect(denon.devicePort, denon.deviceIp);

        Socket.once('connect', function() {
          if(denon.command) {
            Socket.write(denon.command + "\r");
          }

          denon.callback(null, 'ok');
        });

        if(denon.command === 'state') {
          Socket.setTimeout(denon.timeout, function() {
            Socket.destroy();
            denon.callback({ code : 'ETIMEDOUT' });
          });
        }

        Socket.on('data', function(dataReply) {
          denon.callback(null, dataReply);
        });

        Socket.once('end', function() {
          Socket = null;
        });

        Socket.once('error', function(err) {
          if((err.code !== 'ETIMEDOUT') || (denon.command !== 'state')) {
            denon.callback(err);
          }
        });
      }
    }
  };
}());