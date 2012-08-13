(function( window, undefined ){
    var $ = window.jQuery,
        document = window.document,
        _instanceCounter = 0,
        // @link https://developers.google.com/youtube/js_api_reference
        YoutubeApi = (function() {
            var _isLoadRequested = false;
            return {
                loadAsynchronously: function() {
                    _isLoadRequested = true;
                    var tag = document.createElement('script');
                    tag.src = "//www.youtube.com/iframe_api";
                    var firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                },
                isLoadRequested: function() {
                    return _isLoadRequested;
                },
                isReady: function() {
                    return window.YT !== undefined && window.YT.Player !== undefined;
                },
                ready: function( callback ) {
                    var timerFn, timerRef, that = this;
                    (function(delay){
                        timerRef = setTimeout( timerFn = function(){
                            if ( that.isReady() ) {
                                callback( window.YT );
                            } else {
                                timerRef = setTimeout( timerFn, delay );
                            }

                        }, delay );
                    })( 550 );
                }
            }
        }()),
        ApiAdapter = {
            Youtube : function( settings, handlers ){
                var _player,
                    _renderUI = function( api ) {
                        try {
                            var videoElId = settings.boundingBox.find("div.pp-video").attr("id");
                            _player = new api.Player(videoElId, {
                                videoId: settings.youtubeVideoId,
                                playerVars: {
                                    controls: 0,
                                    autoplay: settings.autoplay,
                                    hd: settings.hd,
                                    wmode: "transparent",
                                    origin: settings.origin
                                },
                                events: {
                                    'onReady': handlers.onReady,
                                    'onStateChange': handlers.onStateChange
                                }
                            });
                        } catch( e ) {
                            window.console && console.log( e );
                            settings.boundingBox.html( '<iframe src="http://www.youtube.com/embed/'
                                + settings.youtubeVideoId + '?rel=0&autoplay='
                                + settings.autoplay + '&wmode=transparent&hd=1" '
                                + 'frameborder="0" allowfullscreen></iframe>' );
                        }
                    };

                YoutubeApi.isLoadRequested() || YoutubeApi.loadAsynchronously();
                YoutubeApi.ready(_renderUI);

                return {
                    state: {
                        UNSTARTED: -1,
                        ENDED: 0,
                        PLAYING: 1,
                        PAUSED: 2,
                        BUFFERING: 3,
                        CUED: 5
                    },
                    play: function() {
                        _player.playVideo();
                    },
                    stop: function() {
                        _player.stopVideo();
                    },
                    pause: function() {
                        _player.pauseVideo();
                    },
                    mute: function( flag ) {
                        _player[ flag ? "mute" : "unMute" ]();
                    },
                    currentTime: function( curTime ) {
                        curTime !== undefined && _player.seekTo( curTime, true );
                        return _player.getCurrentTime();
                    },
                    duration: function() {
                        return _player.getDuration();
                    }
                }
            },
            VideoElement : function( settings, handlers ){
                var _player = settings.boundingBox.find("video").get(0);
                _player.onloadstart = function( e ) {
                    handlers.onReady( e );
                    e.data = -1;
                    handlers.onStateChange( e );
                };
                _player.onplay = function( e ) {
                    e.data = 1;
                    handlers.onStateChange( e );
                };
                _player.onpause = function( e ) {
                    e.data = 2;
                    handlers.onStateChange( e );
                };
                return {
                    state: {
                        UNSTARTED: -1,
                        ENDED: 0,
                        PLAYING: 1,
                        PAUSED: 2,
                        BUFFERING: 3,
                        CUED: 5
                    },
                    play: function() {
                        _player.play();
                    },
                    stop: function() {
                        _player.stop();
                    },
                    pause: function() {
                        _player.pause();
                    },
                    mute: function( flag ) {
                        _player.mue( flag );
                    },
                    currentTime: function( curTime ) {
                        if (curTime !== undefined) {
                            _player.currentTime = curTime;
                        }
                        return _player.currentTime;
                    },
                    duration: function() {
                        return _player.duration;
                    }
                }
            }
        },
        pPlayer = function( settings ) {

           var  tpls = {
                playpause:
                    '     <div class="button">' +
                    '        <button class="pause"><!-- --></button>' +
                    '        <button class="play"><!-- --></button>' +
                    '    </div>',
                progress:
                    '    <div><div class="progressBar"><div><!-- --></div></div></div>',
                timer:
                    '    <div class="timer">00:00 | 00:00</div>',
                mute:
                    '    <div class="button">' +
                    '        <button class="mute"><!-- --></button>' +
                    '        <button class="unmute"><!-- --></button>' +
                    '    </div>',
                fullscreen:
                    '    <div class="button">' +
                    '        <button class="enterFullscreen"><!-- --></button>' +
                    '        <button class="leaveFullscreen"><!-- --></button>' +
                    '    </div>'
               },
               adapter,
               $boundingBox = settings.boundingBox,
               $pauseBtn,
               $playBtn,
               $muteBtn,
               $unmuteBtn,
               $enterFullscreenBtn,
               $leaveFullscreenBtn,
               $timer,
               $progressBar,
               $progressBarCursor,
               backup;

               settings = $.extend({
                    boundingBox: null,
                    youtubeVideoId: undefined,
                    autoplay: 1,
                    hd: 1,
                    origin: undefined,
                    adapter: undefined, // "VideoElement" or "Youtube"
                    features: [ "playpause", "progress", "timer", "mute", "fullscreen" ]
               }, settings);

           return {
               getPlayerHtml: function() {
                   var html = '';
                   $.each(settings.features, function( inx, feature ) {
                       html += tpls[ feature ];
                   });
                   return '<div class="controls">' +
                    '     <div>' + html +
                    '    </div>' +
                    '</div>';
               },
               hasPlayerVideoElements: function() {
                   return $boundingBox.find("div.pp-video > video").length;
               },
               hasBrowserVideoElementSupport: (function() {
                    var inputElem = document.createElement('video');
                    return inputElem.play !== undefined;
               }()),
               hasDivXWebPlayerOn: function() {
                    var divx = $( 'embed[type="video/divx"]' );
                    return divx && divx.length && divx.attr( 'mode' ) == 'null';
               },
               fallbackOnDivX: function() {
                   var that = this;
                    window.setTimeout(function(){
                       if ( that.hasDivXWebPlayerOn() ) {
                            $boundingBox.html( "" );
                            $boundingBox.pPlayer({
                                youtubeVideoId: "YE7VzlLtp-4",
                                autoplay: 0,
                                adapter: "Youtube",
                                origin: "http://os.sheiko.crylan.com"
                            });
                       }
                   }, 500);
               },
               renderUI: function() {
                   var that = this,
                       apapterClass,
                       videoElId = "pp-player" + _instanceCounter;

                   $boundingBox.html( function(inx, html){
                       return '<div class="pp-video">' + html + '</div>' + that.getPlayerHtml()
                   });
                   $boundingBox
                        .addClass("ppVideoWrapper")
                        .find("div.pp-video").attr("id", videoElId);

                   $pauseBtn = $boundingBox.find('.controls button.pause');
                   $playBtn = $boundingBox.find('.controls button.play');
                   $muteBtn = $boundingBox.find('.controls button.mute');
                   $unmuteBtn = $boundingBox.find('.controls button.unmute');
                   $enterFullscreenBtn = $boundingBox.find('.controls button.enterFullscreen');
                   $leaveFullscreenBtn = $boundingBox.find('.controls button.leaveFullscreen');
                   $leaveFullscreenBtn.show =
                   $pauseBtn.show =
                   $playBtn.show =
                   $muteBtn.show =
                   $unmuteBtn.show = function() {
                       $( this ).css({"display": "block"});
                   }

                   $timer = $boundingBox.find('.controls .timer');
                   $progressBar = $boundingBox.find('.controls .progressBar');
                   $progressBarCursor = $boundingBox.find('.controls .progressBar > div');

                   if ( settings.adapter ) {
                        apapterClass = settings.adapter;
                   } else {
                        apapterClass = this.hasPlayerVideoElements() ? "VideoElement" : "Youtube";
                   }

                   if ( !this.hasBrowserVideoElementSupport ) {
                       apapterClass = "Youtube";
                   } else {
                       this.fallbackOnDivX();
                   }

                   if ( apapterClass === "Youtube" && settings.youtubeVideoId === undefined ) {
                       throw new
                        Error( "Parameter youtubeVideoId is mondatory to play a youtube video" );
                   }

                   adapter = new ApiAdapter[ apapterClass ](settings, {
                        onReady: function( e ) {
                            that.startTimer();
                        },
                        onStateChange: function( e ) {
                            if ( e.data === adapter.state.PLAYING ) {
                                $playBtn.hide();
                                $pauseBtn.show()
                            } else {
                                $playBtn.show();
                                $pauseBtn.hide()
                            }
                        }
                    });

                   return this;
               },
               syncUI: function() {
                   $pauseBtn.on("click", $.proxy(this.pauseVideo, this));
                   $playBtn.on("click", $.proxy(this.playVideo, this));
                   $muteBtn.on("click", $.proxy(this.muteVideo, this));
                   $unmuteBtn.on("click", $.proxy(this.unmuteVideo, this));
                   $progressBar.on("click", $.proxy(this.handleProgressBar, this));
                   $enterFullscreenBtn.on("click", $.proxy(this.enterFullscreen, this));
                   $leaveFullscreenBtn.on("click", $.proxy(this.leaveFullscreen, this));

                   $( document ).on( "mozfullscreenchange", $.proxy(this.handleFullscreenChange, this));
                   $( document ).on( "webkitfullscreenchange", $.proxy(this.handleFullscreenChange, this));
                   $( document ).on( "fullscreenchange", $.proxy(this.handleFullscreenChange, this));
               },
               getTimeByFloat: function( ctFloat ) {
                    var t = {};
                    t.sec = Math.floor( ctFloat );
                    t.ms = Math.floor(ctFloat * 100 - t.sec * 100);
                    t.ms.toString().length < 2 && (t.ms = "0" + t.ms); // 5 => "05"
                    return t;
               },
               playVideo: function() {
                    $playBtn.hide();
                    $pauseBtn.show();
                    adapter.play();
                },
                stopVideo: function() {
                    adapter.stop();
                },
                pauseVideo: function() {
                    $playBtn.show();
                    $pauseBtn.hide();
                    adapter.pause();
                },
                muteVideo : function() {
                    $unmuteBtn.show();
                    $muteBtn.hide();
                    adapter.mute( true );
                },
                unmuteVideo : function() {
                    $unmuteBtn.hide();
                    $muteBtn.show();
                    adapter.mute( false );
                },
                handleFullscreenChange: function() {
                    if ((document.fullScreenElement && document.fullScreenElement !== null) ||
                        (!document.mozFullScreen && !document.webkitIsFullScreen)) {
                        this.leaveFullscreen();
                    } else {
                        this.enterFullscreen();
                    }
                },
                enterFullscreen: function() {
                    $boundingBox.addClass( "fullscreen" );
                    $enterFullscreenBtn.hide();
                    $leaveFullscreenBtn.show();
                    var elem = $boundingBox.get(0);
                    if (elem.requestFullScreen) {
                        elem.requestFullScreen();
                    } else if (elem.mozRequestFullScreen) {
                        elem.mozRequestFullScreen();
                    } else if (elem.webkitRequestFullScreen) {
                        elem.webkitRequestFullScreen();
                    }
                },
                leaveFullscreen: function() {
                    $boundingBox.removeClass( "fullscreen" );
                    $enterFullscreenBtn.show();
                    $leaveFullscreenBtn.hide();
                    if (document.cancelFullScreen) {
                        document.cancelFullScreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitCancelFullScreen) {
                        document.webkitCancelFullScreen();
                    }
                },
                handleProgressBar: function( e ) {
                    var offset, percent, newCurTime;
                    e.preventDefault();
                    offset = e.clientX - $progressBar.offset().left;
                    percent = Math.floor(offset / ($progressBar.width() / 100));
                    newCurTime = adapter.duration() / 100 * percent;
                    this.updateProgressBarCursor( percent );
                    adapter.currentTime( newCurTime );
                },
                updateTimer : function( line ) {
                    $timer.html( line );
                },
                updateProgressBarCursor : function( progressPercents ) {
                    $progressBarCursor.css({"width": progressPercents + "%"});
                },
                startTimer : function() {
                    var timerFn, timerRef, timerOut = null, that = this;
                    (function(delay){
                        timerRef = setTimeout( timerFn = function(){
                            if ( adapter.currentTime ) {
                                var curTime = that.getTimeByFloat( adapter.currentTime() ),
                                duration = that.getTimeByFloat( adapter.duration() ),
                                progressPercents = Math.floor( (adapter.currentTime() * 100) /
                                    adapter.duration() ),
                                line = curTime.sec + ":" + curTime.ms
                                    + " | " + duration.sec + ":" + duration.ms;

                                if ( timerOut !== line && !isNaN(duration.sec) ) {
                                    that.updateTimer( line );
                                    that.updateProgressBarCursor( progressPercents );
                                }
                                timerOut = line;
                            }
                            if ($boundingBox.hasClass( "ppVideoWrapper" )) {
                                timerRef = setTimeout( timerFn, delay );
                            }
                        }, delay );
                    })( 150 );
               }
           }
        };
        $.fn.pPlayer = function( settings ) {
            var player = new pPlayer($.extend({
                boundingBox: $( this )
            }, settings));
            _instanceCounter++;
            player.renderUI().syncUI();
        }

}( window ));