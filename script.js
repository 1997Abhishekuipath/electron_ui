function chatbot() {
    window.__bot = {};
    console.log("URL :", window.location.href);
    // window.__bot.server_host_http = "https://itmatec.hitachi-systems.co.in"
    window.__bot.host_backend = "https://itmatec.hitachi-systems.co.in"
    window.__bot.server_host_http = "https://itmatec.hitachi-systems.co.in"
    window.__bot.url_prefix = "/api/chat/bot/";
    window.__bot.website_user = false
    window.__bot.Id=[];
    window.__bot.getUrlParams = function (url, name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(url);
        if (results == null) {
            return null;
        }
        return decodeURI(results[1]) || 0;
    }


    try {
        window.__bot.bot_name = new URL(window.location.href).searchParams.get("bot_name");
        window.__bot.web_uid = new URL(window.location.href).searchParams.get("web_uid");
        window.__bot.web_user = new URL(window.location.href).searchParams.get("user");
        window.__bot.host_parent = new URL(window.location.href).searchParams.get("host_parent");
        window.__bot.host_backend = new URL(window.location.href).searchParams.get("host_backend") ? new URL(window.location.href).searchParams.get("host_backend") : window.__bot.host_backend;
        window.__bot.website_user = new URL(window.location.href).searchParams.get("website_user") ? new URL(window.location.href).searchParams.get("website_user") : false;
        console.log("no error with search params")
    } catch (err) {
        console.log("error with search params", err);
        window.__bot.host_parent = window.__bot.getUrlParams(new URL(window.location.href), "host_parent");
        window.__bot.host_backend = window.__bot.getUrlParams(new URL(window.location.href), "host_backend");
        window.__bot.web_uid = window.__bot.getUrlParams(new URL(window.location.href), "web_uid");
        window.__bot.web_user = window.__bot.getUrlParams(new URL(window.location.href), "user");
    }
    console.log("botname1", window.__bot.bot_name , window.__bot.host_backend)
    window.__bot.server_host_http = window.__bot.host_backend
    if (window.__bot.bot_name != null || window.__bot.bot_name != undefined) {
        console.log("botname", window.__bot.bot_name, document.getElementsByClassName("chat-box-header").innerText)
        document.getElementsByClassName("chat-box-header")[0].childNodes[0].data = window.__bot.bot_name
    }

    window.__bot.sessionInfo = function () {
        console.log("localstorage");
        if (!localStorage.getItem('session_id' + window.__bot.web_uid)) {
            window.__bot.session_id = Date.now() + '' + Math.floor(Math.random() * 100000);
            x = localStorage.setItem('session_id' + window.__bot.web_uid, window.__bot.session_id);
            console.log("local", x)
        } else if (localStorage.getItem('session_id' + window.__bot.web_uid)) {
            window.__bot.session_id = localStorage.getItem('session_id' + window.__bot.web_uid);
            window.__bot.web_user = JSON.stringify({
                "user_identity": window.__bot.session_id
            });
            console.log("local 2", window.__bot.session_id)
        }
    }

    window.__bot.toggle_chatui = function () {
        $("#chat-circle").toggle("scale");
        $(".chat-box").toggle("scale");
    };

    if (window.__bot.web_user === {} || window.__bot.web_user === null) {
        console.log('entered web', window.__bot.web_user)
        window.__bot.user_verified = false;
        window.__bot.sessionInfo();
    } else {
        window.__bot.session_id = window.__bot.web_user.user_identity
    }


    window.__bot.userVerification = function () {
        let params = {
            web_uid: window.__bot.web_uid,
            web_user: window.__bot.web_user,
            web_session: window.__bot.session_id,
            website_user: window.__bot.website_user,
        };
        fetch(window.__bot.server_host_http + window.__bot.url_prefix + "user_info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        }).then(function (response) {
            console.log("response", response)
            return response.json();
        }).then(function (data) {
            window.__bot.hide_typing_indicator();
            console.log(data);
            window.__bot.handleBotResponse(data);
            window.__bot.data = data;
            window.__bot.user_verified = data.data.authentic_user;
            window.__bot.user_email = data.data.user_email ? data.data.user_email : null;
            window.__bot.user_identity = data.data.user_identity ? data.data.user_identity : null;
            if (window.__bot.user_verified == true || window.__bot.user_verified == 'true') {
                console.log('user verified', window.__bot.user_verified);
                if (localStorage.getItem('session_id' + window.__bot.web_uid) != window.__bot.user_identity && !window.__bot.user_identity === null) {
                    localStorage.setItem('session_id' + window.__bot.web_uid, window.__bot.user_identity);
                    console.log('user setup', window.__bot.user_identity);
                }
            }
        }).catch(function (err) {
            console.log(err);
            data = {
                "data": {
                    "response_messages": [{
                        "type": "text",
                        "content": {
                            "text": [err.message]
                        }
                    }]
                }
            }
            window.__bot.handleBotResponse(data);
        });
    }


    window.__bot.handleBotResponse = function (data) {
        console.log("message recieved", data);
        let response = data.data;

        // console.log("INTENT: ", response.intent);
        // console.log("ACTION: ", response.action);
        let response_messages = response.response_messages;
        setTimeout(function () {
            if (response.type === "voice") {
                let input_message = response.input_message;
                // window.__bot.generate_message(input_message, "self");
                if (input_message !== "") {
                    if (input_message === "Sorry.. Unable to Recognize Please Retry") {
                        window.__bot.hide_voice_recognizing_indicator();
                        var template_text = document.getElementById("template_text").innerHTML;
                        var rendered_text = Mustache.render(template_text, {
                            text: input_message
                        });
                        window.__bot.generate_message(rendered_text, "user");
                        window.__bot.awaiting_response = false;
                    } else {
                        window.__bot.process_input(input_message, undefined);

                        // window.__bot.show_typing_indicator();
                    }
                }
                // let audio_content = response.audio_content;
                // window.__bot.play_blob_data(audio_content);
            } else {
                window.__bot.process_messages(response_messages, 0);
            }
        }, 1);
    };


    window.__bot.handleUserResponse = function (message, display_text) {
        window.__bot.chat_form_hide(null);
        if (message instanceof Blob) {
            window.__bot.sendMessage(message);
        } else {
            var payload = {
                input_message: message,
                display_text: display_text
            };
            // window.__bot.stop_blob_data();
            // window.__bot.show_typing_indicator();
            window.__bot.sendMessage(JSON.stringify(payload));
            // document.getElementById("template_typing")
            // var template_text = document.getElementById("template_typing").innerHTML;
            // var rendered_text = Mustache.render(template_text, {
            //     text: ""
            // });

            // window.__bot.generate_message()
        }
    };


    window.__bot.sendMessage = function (message) {
        window.__bot.show_typing_indicator();
        let params = {
            web_uid: window.__bot.web_uid,
            web_user: window.__bot.web_user,
            web_session: window.__bot.session_id ? window.__bot.session_id : '',
            user_verified: window.__bot.user_verified,
            website_user: window.__bot.website_user,
            userInput: message
        };
        console.log('params', params)
        fetch(window.__bot.server_host_http + window.__bot.url_prefix, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        }).then(function (response) {
            console.log("response", response)
            return response.json();
        }).then(function (data) {
            window.__bot.hide_typing_indicator();
            console.log(data);
            window.__bot.handleBotResponse(data);
            window.__bot.user_verified = data.data.authentic_user;
            window.__bot.data = data;
            window.__bot.user_verified = data.data.authentic_user;
            window.__bot.user_email = data.data.user_email ? data.data.user_email : null;
            window.__bot.user_identity = data.data.user_identity ? data.data.user_identity : null;
            if (window.__bot.user_verified) {
                if (localStorage.getItem('session_id' + window.__bot.web_uid) != window.__bot.user_identity & window.__bot.user_identity != null) {
                    window.__bot.session_id = window.__bot.user_identity;
                    window.__bot.web_user = JSON.stringify({
                        "user_identity": window.__bot.user_identity
                    });
                    localStorage.setItem('session_id' + window.__bot.web_uid, window.__bot.user_identity);
                    console.log('user setup', window.__bot.user_identity);
                }
            }
        }).catch(function (err) {
            console.log(err);
            data = {
                "data": {
                    "response_messages": [{
                        "type": "text",
                        "content": {
                            "text": [err.message]
                        }
                    }]
                }
            }
            window.__bot.handleBotResponse(data);
        })
    }


    window.__bot.disable_text_input = function () {
        $("#chat-input").attr("disabled", true);
        $("#chat-input").addClass("disabled_element");
        $("#chat-submit").addClass("disabled_element");
        $("#recordButton").addClass("disabled_element");
    };


    window.__bot.enable_text_input = function () {
        $("#chat-input").attr("disabled", false);
        $("#chat-input").removeClass("disabled_element");
        $("#chat-submit").removeClass("disabled_element");
        $("#recordButton").removeClass("disabled_element");
    };


    window.__bot.disable_reset_chat = function () {
        $("#chat-box-delete").addClass("disabled_element");
    };


    window.__bot.enable_reset_chat = function () {
        $("#chat-box-delete").removeClass("disabled_element");
    };


    window.__bot.disable_quick_replies = function () {
        $(".replies_container_div").addClass("disabled_element");
    };


    window.__bot.disable_chat_log = function () {
        $(".chat-msg").addClass("disabled_element");
    };


    window.__bot.show_voice_recognizing_indicator = function () {
        window.__bot.hide_voice_recognizing_indicator();
        var template = document.getElementById("voice_recognizing").innerHTML;
        var rendered = Mustache.render(template, {});
        $(".chat-logs").append(rendered);
    };


    window.__bot.hide_voice_recognizing_indicator = function () {
        $(".chat-logs").find(".loading").remove();
    };


    window.__bot.service_init_main = function () {
        let params = {
            web_uid: window.__bot.web_uid,
            website_user: window.__bot.website_user,
        };
        return fetch(window.__bot.server_host_http + window.__bot.url_prefix + "web_uid", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        });
    };


    window.__bot.show_typing_indicator = function () {
        // window.__bot.hide_typing_indicator();
        // window.__bot.hide_voice_recognizing_indicator();
        var template = document.getElementById("template_typing").innerHTML;
        var rendered = Mustache.render(template, {});
        window.__bot.generate_message(rendered, "user");
    };


    window.__bot.hide_typing_indicator = function () {
        // $(".chat-logs").find(".loading").remove();
        $(".loading").closest('.chat-msg').remove();
    };


    window.__bot.radioClick = function (rating) {
        window.__bot.chat_form_hide($(".rate"));
        var data = {};
        data.web_uid = window.__bot.web_uid;
        data.form_name = "bot_ratings";
        data.web_user = window.__bot.web_user;
        data.web_session = window.__bot.session_id ? window.__bot.session_id : '';
        data.user_verified = window.__bot.user_verified;
        data.bot_rating = rating;
        data.user_email = window.__bot.user_email ? window.__bot.user_email : '';
        data.website_user = window.__bot.website_user;
        var request_body = JSON.stringify(data);
        var request_headers = {
            "Content-Type": "application/json"
        };
        fetch(window.__bot.server_host_http + window.__bot.url_prefix + "submit_form", {
            method: "POST",
            headers: request_headers,
            body: request_body
        }).then(function (response) {
            console.log(response);
            return response.json()
        }).then(function (response_data) {
            console.log(response_data);
            window.__bot.process_messages(response_data.data.response_messages,
                0);
        });

    }


    window.__bot.scroll_to_bottom = function () {
        $(".chat-logs").stop().animate({
            scrollTop: $(".chat-logs")[0].scrollHeight
        }, 1000);
    };


    window.__bot.scroll_to_top = function () {
        $(".chat-logs").stop().animate({
            scrollTop: 0
        }, 200);
    };


    window.__bot.process_messages = function (response_messages, index) {
        window.__bot.chat_form_hide(null);
        setTimeout(function () {
            response_message = response_messages[index];
            if (response_messages.length === 0 || response_message[0] == "") { // ignore empty string messages
            } else if (response_message[0]) {
                window.__bot.generate_message(response_message[0], "self");
            } else {
                console.log(response_message);
                final_message = "";
		class_name ="cm-msg-text"    
                style="display:block";
		if (["text", "button", "link", "form","intentDetectionConfidence"].indexOf(response_message.type) != -1) {
                    (response_message.content.text || []).map(function (text) {
                        var template_text = document.getElementById("template_text").innerHTML;
                        var rendered_text = Mustache.render(template_text, {
                            text: text
                        });
                        final_message += rendered_text;
                    });
                     console.log('hello response<F4> type',response_message)
//                    (response_message.content.intentDetectionConfidence || []).map(function (intent) {
//                        var template_intent = document.getElementById("template_intent").innerHTML;
//                        var rendered_text = Mustache.render(template_intent, {
//                            intent: intent
//                        });
//                        final_message += rendered_text;
//			class_name ="intent"    
//                        console.log('intent---->>>>',final_message)
//                    });

                    if (response_message.type == "button") {
                        final_replies = "";
                        response_message.content.buttons.map(function (reply) {
                            reply_display_text = reply.title || reply;
                            reply_slug = reply.payload || reply_display_text;
                            var template_quick_reply_replies = document.getElementById("template_quick_reply_replies").innerHTML;
                            var rendered_replies = Mustache.render(template_quick_reply_replies, {
                                reply_display_text: reply_display_text,
                                reply_slug: reply_slug
                            });
                            final_replies += rendered_replies;
                        });
                        var template_quick_reply = document.getElementById("template_quick_reply").innerHTML;
                        var rendered_quick_reply = Mustache.render(template_quick_reply, {
                            rendered_replies: final_replies
                        });
                        final_message += rendered_quick_reply;
                    }

                  if (response_message.type == "intentDetectionConfidence") {

                              (response_message.content.intentDetectionConfidence || []).map(function (intent) {
                        var template_intent = document.getElementById("template_intent").innerHTML;
                        var rendered_text = Mustache.render(template_intent, {
                            intent: intent
                        });
                        final_message += rendered_text;
                        class_name ="intent";
	                style="display:none";
                        console.log('intent---->>>>',final_message,'testtttt',style,response_message.type)
                    });

                  }
			
                    if (response_message.type == "link") {
                        response_message.content.links.map(function (link) {
                            var template_links = document.getElementById("template_links").innerHTML;
                            var rendered_links = Mustache.render(template_links, {
                                link: link
                            });
                            final_message += rendered_links;
                        });
                    }

                    if (response_message.type == 'form') {
                        var form = response_message.content;
                        var template_form_container = document.getElementById("template_form_container").innerHTML;
                        var template_form = document.getElementById("template_form").innerHTML;
                        var template_form_field_text = document.getElementById("template_form_field_text").innerHTML;
                        var template_form_field_email = document.getElementById("template_form_field_email").innerHTML;
                        var template_form_field_textarea = document.getElementById("template_form_field_textarea").innerHTML;
                        var template_form_field_password = document.getElementById("template_form_field_password").innerHTML;
                        var template_form_field_select = document.getElementById("template_form_field_select").innerHTML;
                        var template_form_field_select_option = document.getElementById("template_form_field_select_option").innerHTML;
                        var template_form_field_file_pdf = document.getElementById("template_form_field_file_pdf").innerHTML;
                        var template_form_field_calendar = document.getElementById("template_form_field_calendar").innerHTML;
                        if (form.name == "star_form") {
                            var template = document.getElementById("template_star_rating").innerHTML;
                            var rendered = Mustache.render(template, {});
                            final_message += rendered
                        } else {
                            var rendered_fields = form.fields.map(function (field) {
                                if (field.type == "text") {
                                    var rendered_field = Mustache.render(template_form_field_text, {
                                        "form_name": form.name,
                                        "field": field
                                    });
                                } else if (field.type == "email") {
                                    var rendered_field = Mustache.render(template_form_field_email, {
                                        "form_name": form.name,
                                        "field": field
                                    });
                                } else if (field.type == "textarea") {
                                    var rendered_field = Mustache.render(template_form_field_textarea, {
                                        "form_name": form.name,
                                        "field": field
                                    });
                                } else if (field.type == "password") {
                                    var rendered_field = Mustache.render(template_form_field_password, {
                                        "form_name": form.name,
                                        "field": field
                                    });
                                } else if (field.type == "select") {
                                    var options = field.options.map(function (option) {
                                        return Mustache.render(template_form_field_select_option, {
                                            "option": option
                                        });
                                    })
                                    var rendered_options = options.join("");
			            console.log("rendered_options",rendered_options)		
                                    var rendered_field = Mustache.render(template_form_field_select, {
                                        "form_name": form.name,
                                        "field": field,
                                        "options": rendered_options
                                    });
                                } else if (field.type == "file_pdf") {
                                    var rendered_field = Mustache.render(template_form_field_file_pdf, {
                                        "form_name": form.name,
                                        "field": field
                                    });
                                } else if (field.type == "calendar") {
                                    var rendered_field = Mustache.render(template_form_field_calendar, {
                                        "form_name": form.name,
                                        "field": field
                                    });
                                } else {
                                    return "";
                                }
                                return rendered_field;
                            });
                            var rendered_form = Mustache.render(template_form, {
                                name: form.name,
                                fields: rendered_fields.join("")
                            });
                            var rendered_form_container = Mustache.render(template_form_container, {
                                form: rendered_form
                            });
                            final_message += rendered_form_container;

                        }
                    }

                  console.log('msggggggg',final_message)
                }
                if (final_message) { // window.__bot.disable_quick_replies();
                    window.__bot.generate_message(final_message, "user",class_name,style);
                }
            }
            if (response_messages[index + 1]) { // window.__bot.show_typing_indicator();
                window.__bot.process_messages(response_messages, index + 1);
            } else {
                window.__bot.enable_reset_chat();
                window.__bot.awaiting_response = false;
            }
        },
            index == 0 ? 1 : 1
        );
    };


    window.__bot.process_input = function (msg, display_text) {
        console.log(msg, display_text)
        window.__bot.disable_reset_chat();
        // window.__bot.disable_quick_replies();
        window.__bot.awaiting_response = true;
        console.log("Promise fulfilled");
        if (!(msg instanceof Blob)) {
            console.log("processing text input");
	    class_name ="cm-msg-text";
	    style="display:block"
            window.__bot.generate_message(display_text || msg, "self",class_name,style);
        }
        window.__bot.handleUserResponse(msg, display_text);
    };


    window.__bot.generate_message = function (msg, type,class_name,style) {
        let profile_image;
        if (type == "self") {
if (type == "self") {
 profile_image ='<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFYklEQVR4nO1aW2xUVRS9VXxFjPg2PuLjy2c0NjFoyuwzpS0ze09p0dzO3tOSJiY+vihWfvyx+qdEvxTFaPjwy/iJCuiHSjRFK6BigliBGB8YUWNigghIMfveOw/a3rnn3LmtaNjJSSY5j33W7HPWfpzreaflfyrQN7woT7zcEK81xG8a5K8M8i+G+HDQgt+y2yBv1DG5kvR2dfkXeqeCFAqFcwzJICBvAZS/DckJlxbN2Zwvliu6ljffAjB8rinJKKD8WNsUyV+A/IFBHssRr8j38q1L+1deomO1Bb9p4LY8Vu7TMUC8FVCONID6AYhX69h5AZErlotAsrdhAzsMysMdVLnIdS2do3MNyc6apZC/MSTL5tYKyC82HI2dgFzIaPm24A9C+bwB0POZH7fOXr4CiLeHCuRPQzLi+/6Z2f9ZsACQHw0JIgAz0d09dHk2iy8rXx+Z+wQQ78kVK7c3G5/D8s1A/LhBeR+I9ylwQDlkkPcbktdyJbknSWeeBu4wyJMRmEndQ8uWqIOQj/XCxo2FklxqkDcA8vEEtpoC4qearVVdD5A/qYJJbZmAbarHiXgb+P7CuLGqxKB86Ui/x4D45e7uofNj9+D7CxvATKS6MwblpepxavrvjY2dYZA/dPUhddrmj3zfPzvB0pPRqXjBCUSeBKsXO+lOmKLcnxZEncLLa5rpAKzcWSMAW2pe7PvnBZc0NOeqpPFBONIqEOJvk/RAwGbhfbE6Yob4saqfsKDYNoP8R6tAtC2lyo3J1CxfRONHki94PexINGFHwb8sCxChVSpdtkdew5mmVgHkocjU25MWDcf7V2YGpCT9FirbquEMIEvsKEPybgTkQRsgAe1mBMT2EkOJH4nGb4oN4DSsDqLYvuFFNoveu/yBC9TBZWSRm2x09vT4F0dR87FZ8xk1bbgov+c5iEH5rmUQyMddwncg3qrzNDmb2YnybEhv8oQTEJJNrVuEd7noBJIno3lrZ+t8KwRS6XNblNe1DAR5g4vOHPGKaN7GGZ3VMECjV+sVNTwh+SkDixzQtTxL0ewzIqU9MzqB5Dft1Mtku6COzYq1XDLMjrr/OjgTSJQ/Nwvgpkt7+0NnNcRArVjksIveQlj0COoEmQAJ5/GWDCwyu09IAoJyJJOjpZKnSnuQAaamXjnUWRq4y0UnaGgf0vavMzprMb+lY5qVRVI0neuqr7MweEvsZa/5A0f6bTD1QWdrEP/sepQbnbe6DG+6APJzaRxifX55jbNFSjKaRpdBHot3iClDlJMZTD61BoE8oTlGGl2gFc24EEXz8rAgYB80zlBQGLzGFkgn+Ven0dFTCxr5aOw+AeUdlzB+uuh5t74fKa1hwhKrMtbbsYMAyysjStyRRkkU1tsBaVJeskms9BWgKfu4pLrTZUnv0A3WQFJUD/PV6g7x94lsV2cf/sylvqsb02qkPWvxtjxWrrNeH2CBhvvR0V+dOCGwSrUclFStUOdEcrchfiWNd9c5QPwqFAYXJ+kxJRmN2G7S2vdEJpyKK9BF1b9VJz0DtNx4l9auZqvxNhToppyfMuolU/m6WjLVKjmgvN740pR946OG+A3dfC1kjwrp+mbiuUpQcawXkMf1kcei0p5ZA83jidfX7h3yeOpnuaBuFb5rzMvmTRwo4n36xOG1Ikv6ytfWTPtvNOT9SuteFtK1nK9yo9bMQIzrqfCylOjhZ31WBTmLV611c/r2rvQ3l/cGSPbmitztzYeEoUzw+nogMwBhaDSSJtFqWVSpfn4RFiCU/503r/5os1bWNZ/xTgUJiuAl6QeUZ6K0WT+g+b3h4urv3doHxE9rSp3ma4nT4v1H5B9bLFxZY3MesgAAAABJRU5ErkJggg==">'
        } 
	} else {
            if (window.__bot.bot_icon) {
                profile_image = '<img src="' + window.__bot.bot_icon + '">';
            } else {
		profile_image='<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABtUlEQVR4nO2X20rDQBCG902628fwAN54KFV8JAURfIDuPIBF9Np7tdTqS3jX9FKF7G4q1pKVKR7SomRzajIlHwyEhEn+f2Z22TBWU1NTCE3pt4VUIw7Ka4BpMWpwUJ4AbTE4qCGjBqduoAGm9WvA7DKKiC8DjCqiNpATvKMOBeieAG2+q1pgGCHVnZD+QS7iBeizJYi2fwWX+jSPyttyw9/PUv1e+QbUbfoOgNZlG+BSqywdsFUIVhuAFe3ARtfYB29qg0loB97Urp+bWDGb3eAn594xJ9U53qUyKCQKCorLeRzN5/SHU7fF7PpfET0GxwVWMYqZhIlz9Ht8TqJjeZLZHKTowGLX+o4dcB6nJC/DNYCisaooxGWeF3PWHHIKM1BGsJU3wBMs4mUHd1nEuFVV0QQHNWx0zF6sgazjtLjPR8FnhYzNf6T52M5VYF/f5vd6BO9tXwbVNyBA262LwF4/fdiXcWifx+HsGu+lfR9btoG8g1E2wEH7tA1IdUPaQFP6bboGpD5JLb4sAxy0xrHJVPk4AxzUEaOAoCweIS0eIS0eIS0eIS0eEVIfzy5qampYVfkEHDdTyWe82pcAAAAASUVORK5CYII=">'
            }
        }

        window.__bot.INDEX++;
	if( window.__bot.INDEX >=4){    
        window.__bot.Id.push(window.__bot.INDEX);
	}
	var str = "";
        var template_chat = document.getElementById("template_chat").innerHTML;
        var rendered_chat = Mustache.render(template_chat, {
            INDEX: window.__bot.INDEX,
            type: type,
            msg: msg,
            profile_image: profile_image,
            class_name:class_name,
	    style:style	
        });
        str += rendered_chat;

        $(".chat-logs").append(str);
        $("#cm-msg-" + window.__bot.INDEX).hide().fadeIn(300);
        if (type == "self") {
            $("#chat-input").val("");
        }
        if ($(".chat-logs")[0].children.length == 1) {
            window.__bot.scroll_to_bottom();
            window.__bot.scroll_to_top();
        } else {
            window.__bot.scroll_to_bottom();
        }
    };


    window.__bot.first_message = function () {
        msg = {
            "input_message": "hi"
        }
        window.__bot.sendMessage(JSON.stringify(msg));
    }

    return window.__bot;
}
