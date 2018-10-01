/*global $, document, swipe_left_target, swipe_right_target, btoa, cryptographyAES, key, window, DEBUG, BE_URL, moment */
/*eslint no-global-assign: "error"*/
/*globals kanazzi:true*/
/*exported kanazzi */
/*eslint no-console: ["error", { allow: ["info","warn", "error"] }] */

"use strict";

function loading(show, message) {
    if (show) {
        //$("body").block({ "message": null });
        $.mobile.loading("show", {
            text: message,
            textVisible: true,
            theme: 'b',
            html: '',
        });
    } else {
        $.mobile.loading("hide");
        //$("body").unblock();
    }
}

/*
function parseQuery(queryString) {
    var query = {},
        pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}
*/

function fancyDate(ts) { // eslint-disable-line no-unused-vars

    var d = new Date(Number(ts)),
        min = d.getMinutes(),
        hour = d.getHours(),
        s = '';

    if (min < 10) { min = "0" + min; }
    if (hour < 10) { hour = "0" + hour; }

    s = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + " " + hour + ":" + min;

    return s;
}

function get_stars(n) { // eslint-disable-line no-unused-vars
    var x = "",
        i = 0;

    for (i = 0; i < n; i += 1) {
        x += "*";
    }

    return x;
}

function swipeleftHandler(event) { // eslint-disable-line no-unused-vars
    document.location = swipe_left_target;
}

function swipeRightHandler(event) { // eslint-disable-line no-unused-vars
    document.location = swipe_right_target;
}


function make_base_auth(user, password) { // eslint-disable-line no-unused-vars

    var tok = user + ':' + password,
        hash = btoa(tok);

    return 'Basic ' + hash;
}


/***
  DUMMY SECURITY
 ***/

function encryptText2(pText, cb) { // eslint-disable-line no-unused-vars
    cryptographyAES.doEncryption(
        pText,
        key,
        function (crypted) {
            kanazzi = crypted;  // eslint-disable-line no-unused-vars
            var fn = window[cb];
            // is object a function?
            if (typeof fn === "function") {
                fn();
            }
        },
        function (err) {
            if (DEBUG) { console.error("iCarusi App============> onFailure: " + JSON.stringify(err)); }
        }
    );
}

function encrypt_and_execute(pText, encKeyName, data) { // eslint-disable-line no-unused-vars
    cryptographyAES.doEncryption(
        pText,
        key,
        function (crypted) {
            data[encKeyName] = crypted;
            if (data.cB && data.successCb && data.failureCb) {
                data.cB(data, data.successCb, data.failureCb);
            } else {
                data.cB(data);
            }
        },
        function (err) {
            if (DEBUG) { console.error("iCarusi App============> onFailure: " + JSON.stringify(err)); }
            if (data.failureCb) { data.failureCb(err); }
        }
    );
}

function generic_json_request_new(data, successCb, failureCb) { // eslint-disable-line no-unused-vars

    loading(true, "Loading...");

    $.ajax({
        url: BE_URL + data.url,
        method: data.method,
        data: JSON.stringify(data),
        contentType: "application/json",
        dataType: "json"
    })
        .done(function (response) {

            loading(false, "Loading...");

            if (DEBUG) {
                console.info("Request to " + data.url + " completed");
                console.info("Payload received " + JSON.stringify(response));
            }

            try {
                if (DEBUG) {
                    console.info("Status response: " + response.result);
                }
                if (response.result === "failure") {
                    if (failureCb) {
                        failureCb(response);
                    }
                }
            } catch (err) {
                if (DEBUG) { console.error(err); }
                if (failureCb) {
                    failureCb(err);
                }
            }

            if (successCb) {
                successCb(response);
            }

        })
        .fail(function (err) {
            loading(false, "Loading...");
            if (DEBUG) {
                console.info("iCarusi App============> Error during generic request to " + data.url);
                console.info("iCarusi App============> " + err.responseText);
            }
            if (failureCb) {
                failureCb(err);
            }
        })
        .always(function () {
            loading(false, "Loading...");
        });
}

function locale_date(input_date) { // eslint-disable-line no-unused-vars
    var d = new Date(input_date);
    moment.locale('it');
    return moment(d).format("ddd, DD/MM/YYYY HH:mm");
}
