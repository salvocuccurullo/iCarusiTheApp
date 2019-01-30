/*global $, cordova, device, window, document, loading, alert, getX, generic_json_request_new, encrypt_and_execute*/
/*global encryptText2, navigator, Connection, BE_URL, PullToRefresh, get_ls_bool_default, is_storage_expired_or_invalid*/
/*global power_user, get_ls_bool, base_url_poster, PhotoViewer, fancyDate, confirm, FormData, power_user */
/*eslint no-console: ["error", { allow: ["info","warn", "error", "debug"] }] */

"use strict";

var storage = window.localStorage,
    icarusi_user = "",
    ct_movies = "",
    //tvshows = "",
    jsonTvShows = [],
    currentId = 0,
    kanazzi,
    DEBUG = false,
    top_movies_count = 15,
    sort_type = "datetime_sec",
    sort_order = 1,
    swipe_left_target = "carusi.html",
    swipe_right_target = "index.html",
    device_app_path = "",
    tv_shows_storage,
    tv_shows_storage_ts,
    curr_file_size = 0,
    curr_pic,
    lazy_load = get_ls_bool_default("lazy-load", true),
    current_page = 1,
    search_mode = false,
    append_mode = false,
    search_result,
    tvshow_stat = {"total_show":0, "movies":0, "series":0};

document.addEventListener('deviceready', this.onDeviceReady.bind(this), false); // eslint-disable-line no-unused-vars

function poster(img_name) { // eslint-disable-line no-unused-vars

    var final_pic_url,
        android_version;

    curr_pic = img_name;

    if (curr_pic !== "") {
        final_pic_url = base_url_poster + curr_pic;
    } else {
        final_pic_url = device_app_path + "www/images/no-image-available.jpg";
    }

    if (DEBUG) { console.info("Show poster called on " + final_pic_url); }

    android_version = device.version.split(".");

    if (parseInt(android_version[0], 10) < 5) {
        $("#poster_pic").attr("src", final_pic_url);
        $("#popupPhotoPortrait").popup('open');
    } else {
        PhotoViewer.show(final_pic_url, "");
    }
}

/***
 RESET POPUP DATA
***/

function resetPopupElements() {
    currentId = 0;
    $("#title").prop('readonly', false);
    $("#link").prop('readonly', false);
    $("#title").textinput("option", "clearBtn", true);
    $("#link").textinput("option", "clearBtn", true);
    $('#media').selectmenu('enable');
    $('#tvshow_type').selectmenu('enable');
    $('#giveup').checkboxradio('disable');
    $("#title").val('');
    $("#link").val('');
    $("#curr_pic").val('');
    $('#media').val("").attr('selected', true).siblings('option').removeAttr('selected');
    $('#media').selectmenu('refresh', true);
    $('#tvshow_type').val("").attr('selected', true).siblings('option').removeAttr('selected');
    $('#tvshow_type').selectmenu('refresh', true);
    $("#the_votes_d").hide();
    $("#vote").val(5).slider("refresh");
    $("#send_movie_btn").text("Send...");
    $("#delete_movie_btn").addClass("ui-btn ui-state-disabled");
    $("#send_movie_btn").removeClass("ui-state-disabled");
    $("#pic").removeClass("ui-btn ui-state-disabled");
    $("#nw").prop("checked", false).checkboxradio("refresh");
    $("#giveup").prop("checked", false).checkboxradio("refresh");
    $("#later").prop("checked", false).checkboxradio("refresh");
    $("#season").val('');
    $("#episode").val('');
    $("#comment").val('');
    $("#curr_link").val('');
    $("#upload_result").html('');
    $("#pic").val(null);
    $('#users_votes').empty();
    $("#top_title").html('Add a new movie/serie...');
    $("#btn_link").show();
}


function setCacheInfo() {
    var show_info = get_ls_bool("show-extra-info");
    if (show_info) {

        tv_shows_storage = storage.getItem("tv_shows");
        tv_shows_storage_ts = storage.getItem("tv_shows_count_ts");

        if (tv_shows_storage !== "" && tv_shows_storage !== undefined && tv_shows_storage !== null) {
            $("#cache_info").html("TvShows cached " + JSON.parse(tv_shows_storage).length + " element(s) --- last update " + fancyDate(tv_shows_storage_ts));
        }
    }
}

 /***
    SET TV SHOWS
 ***/

function setTvShows(tvshows, votes_user) {

    try {
        loading(true, 'Rendering movies...');

        if (DEBUG) {
            console.info("iCarusi App============> SetTvShows called");
            //console.info(JSON.stringify(tvshows));
        }

        $("#movie_info_box").html("");

        //if (search_mode || (!search_mode && current_page === 1)) {
        if (!append_mode) {
            $("#movies-list").empty();
            $("#series-list").empty();
            $("#movies-list_nw").empty();
        }

        $('#top-list-voters').empty();
        $('#top-list-movies').empty();

        setCacheInfo();

        if (tvshows.length === 0) {
            $("#movie_info_box").html('<span style="white-space:normal; text-align:center">No Movies/Series available</span>');
        }

        /*
        var bnc = 0,
            r4c = 0,
        */
        var header_content = '',
            header_total,
            content = '',
            count;

        if (sort_type === "avg_vote") {
            tvshows.sort(function (a, b) {
                if (parseFloat(a[sort_type]) > parseFloat(b[sort_type])) {
                    return (sort_order * -1);
                }
                if (parseFloat(a[sort_type]) < parseFloat(b[sort_type])) {
                    return sort_order;
                }
                return 0;
            });
        } else {
            tvshows.sort(function (a, b) {
                if (a[sort_type] > b[sort_type]) {
                    return (sort_order * -1);
                }
                if (a[sort_type] < b[sort_type]) {
                    return sort_order;
                }
                return 0;
            });
        }

        if (!append_mode) {
            header_total = '<li data-role="list-divider" data-theme="b" style="text-align:center">';
            if (!search_mode) {
                header_total += '<span style="color:yellow"> ' + tvshow_stat.total_show + '</span> items available on database</span></li>';
            } else {
                header_total += '<span style="color:yellow">' + $("#movie_search").val() + '</span> matched in total ';
                header_total += '<span style="color:yellow"> ' + tvshow_stat.total_show + ' </span>items</li>';
            }
            $('#movies-list').append(header_total);
            $('#series-list').append(header_total);
        }

        $.each(tvshows, function (index, value) { // eslint-disable-line no-unused-vars

            var comment_count = 0,
                content_nw = '',
                at_least_one_nw = false,
                name = '',
                epi = '',
                season = '',
                users_votes_keys,
                comment = '',
                link = '';

            content = '<li style="white-space:normal;">';

            jsonTvShows[value.id] = value;

            content += '<span style="font-weight:bold">' + value.title + '</span>';

            if (value.avg_vote === 0) {
                content += '<span style="color:#C60419; float:right"> [ N/A ]</span>';
            } else {
                content += '<span style="color:#C60419; float:right"> [ ' + value.avg_vote + ' ]</span>';
            }

            // NW SECTION
            content_nw = '<li style="white-space:normal;">';
            content_nw += '<a data-transition="slide" href="javascript:setPopupData(' + value.id + ',\'nw\')">';
            content_nw += '<b>' + value.title + '</b> <br/>';
            content_nw += '<span style="color:#000099; font-style:italic; font-size:11px;">';

            users_votes_keys = Object.keys(value.u_v_dict);
            $.each(users_votes_keys, function (index1, value1) { // eslint-disable-line no-unused-vars

                comment = value.u_v_dict[value1].comment;
                if (comment !== "") {
                    comment_count += 1;
                }

                if (value.u_v_dict[value1].now_watching) {
                    at_least_one_nw = true;
                    name = value.u_v_dict[value1].us_name;
                    epi = value.u_v_dict[value1].episode;
                    season = value.u_v_dict[value1].season;
                    content_nw += "[" + name + ' S' + season + 'E' + epi + ']&nbsp;&nbsp;';
                }
            });
            content_nw += '</span>';
            content_nw += '</a>';
            content_nw += '</li>';
            // END NW SECTION

            if (value.tvshow_type === "serie") {
                content += '<br/><span style="text-align:right; font-size:11px;">Season ' + value.serie_season + '</span>';
            }
            content += '<br/><span style="text-align:right; font-size:10px;">Added on ' + value.datetime + ' by </span>';
            content += '<span style="color:#000099; font-style:italic; font-size:10px;">' +  value.username + '</span>';

            if (sort_type === "media") {
                content += '<br/><span style="color:#000099; font-style:italic; font-size:10px;">Watched on: <b>' +  value.media + '</b></span>';
            }
            // ICONS BLOCK -------------------------
            content += '<span style="color:#C60419; float:right">';

            // PICTURE ICON
            if (value.poster !== "") {
                content += '<button class="ui-btn ui-icon-camera ui-btn-icon-notext ui-corner-all ui-mini ui-btn-inline" id="btn_show_poster" onclick="poster(\'' + value.poster + '\')"></button>';
            }

            // EDIT ICON
            content += '<button class="ui-btn ui-icon-edit ui-btn-icon-notext ui-mini ui-corner-all ui-btn-inline" id="btn_show_poster" onclick="setPopupData(\'' + value.id + '\',\'a\')"></button>';

            // LINK ICON
            if (value.link !== "") {
                link = value.link.replace(/'/g, "\\'");
                content += '<button class="ui-btn ui-btn-icon-notext ui-icon-forward ui-mini ui-corner-all ui-btn-inline" data-theme="a" id="btn_link" onclick="javascript:open_link(\'' + link + '\')"></button>';
            }

            // COMMENT ICON
            if (comment_count > 0) {
                content += '<button class="ui-btn  ui-mini ui-corner-all ui-btn-inline" data-theme="e" onclick="setComments(\'' + value.id + '\',\'c\')">' + comment_count + '</button>';
            }

            content += '</span><br/>';
            // END ICONS BLOCK ---------------------------

            content += '</li>';

            if (at_least_one_nw) {
                $('#movies-list_nw').append(content_nw);
            }

            if (value.tvshow_type === 'serie') {
                $('#series-list').append(content);
            } else {
                $('#movies-list').append(content);
            }
        });

        // For the top chart force sorting by avg_vote
        tvshows.sort(function (a, b) {
            if (parseFloat(a.avg_vote) > parseFloat(b.avg_vote)) {
                return -1;
            }
            if (parseFloat(a.avg_vote) < parseFloat(b.avg_vote)) {
                return 1;
            }
            return 0;
        });

        header_content = '<li data-role="list-divider" data-theme="b" style="text-align:center">';
        header_content += 'Top<span style="color:yellow"> ' + top_movies_count + ' </span>movies</li>';
        $('#top-list-movies').append(header_content);

        count = 0;
        $.each(tvshows, function (index, value) { // eslint-disable-line no-unused-vars
            if (count === top_movies_count) {
                 return false;
            }
            content = '<li style="white-space:normal;">';
            if (value.avg_vote !== 0) {
                content += '<b>' + value.title + '</b> <span style="color:red; float:right">' + value.avg_vote + '</span>';
            } else {
                content += '<b>' + value.title + '</b> <span style="color:red; float:right">N/A</span>';
            }
            content += '</li>';
            $('#top-list-movies').append(content);
            count += 1;
        });

        header_content = '<li data-role="list-divider" data-theme="b" style="text-align:center">';
        header_content += '<span style="color:yellow"> Top Voters </span></li>';
        $('#top-list-voters').append(header_content);

        votes_user = votes_user.sort(function (a, b) {
            return a.count < b.count;
        });

        $.each(votes_user, function (index, value) { // eslint-disable-line no-unused-vars
            content = '<li style="white-space:normal;">';
            content += '<b>' + value.name + '</b> <span style="color:red; float:right">' + value.count + '</span>';
            content += '</li>';
            $('#top-list-voters').append(content);
        });

        $('#movies-list').listview('refresh');
        $('#series-list').listview('refresh');
        $('#movies-list_nw').listview('refresh');
        $('#top-list-voters').listview('refresh');
        $('#top-list-movies').listview('refresh');


        $('#movies_link').text('Movies (' + tvshow_stat.movies + ')');
        $('#series_link').text('Series (' + tvshow_stat.series + ')');
        $('#movies_nw_link').text('#NW (' + $('#movies-list_nw').children().length + ')');
        /*
        $('#movies_link').text('Movies (' + (parseInt($('#movies-list').children().length, 10) - 1) + ')');
        $('#series_link').text('Series (' + (parseInt($('#series-list').children().length, 10) - 1) + ')');
        $('#movies_nw_link').text('#NW (' + $('#movies-list_nw').children().length + ')');
        */
        checkMoviesCT();

        loading(false, '');

    } catch (err) {
        console.error("Catching an error: " + err);
        storage.setItem("tv_shows", "");          // RESETTING LOCALSTORAGE
        storage.setItem("tv_shows_count_ts", "");
        current_page = 1;
        getTvShows(false);
    }
}

function sort_movies() {
    sort_order *=  -1;
    append_mode = false;

    var tvshows = storage.getItem("tv_shows"),      // GET FROM LOCALSTORAGE
        votes_user = storage.getItem("votes_user");

    if (search_mode) {
        setTvShows(search_result, JSON.parse(votes_user));
    } else {
        $("#movie_search").val("");
        if (tvshows !== "" && tvshows !== undefined && tvshows !== null && votes_user !== "" && votes_user !== undefined && votes_user !== null) {
            setTvShows(JSON.parse(tvshows), JSON.parse(votes_user));
        }
    }
}

function tvShowsNewSuccess(data) {

    if (DEBUG) {
        //console.info(JSON.stringify(data));
        console.info("TvShowsNews Success callback called");
    }

    var tvshows = data.payload.tvshows,
        votes_user = data.payload.votes_user;
    tvshow_stat.total_show = data.payload.total_show;
    tvshow_stat.movies = data.payload.stat.movie;
    tvshow_stat.series = data.payload.stat.serie;

    if (DEBUG) { console.info("- HAS REMOTE MORE DATA? -> + " + data.payload.has_more); }
    if (data.payload.has_more === true) {
        $("#movie_list_footer").show();
        $("#serie_list_footer").show();
    } else {
        $("#movie_list_footer").hide();
        $("#serie_list_footer").hide();
    }

    if (data.payload.query === "") {

        if (current_page > 1) {
            var tvshows_cache = JSON.parse(storage.getItem("tv_shows"));
            if (tvshows_cache === undefined) {
                tvshows_cache = [];
            }
            console.info("TvShows cache size: " + tvshows_cache.length);
            console.info("TvShows just retrieved size: " + tvshows.length);
            tvshows_cache = tvshows_cache.concat(tvshows);
            console.info("New TvShows cache size: " + tvshows_cache.length);
            storage.setItem("tv_shows", JSON.stringify(tvshows_cache));  // SAVE ON LOCALSTORAGE
        } else {
            storage.setItem("tv_shows", JSON.stringify(tvshows));       // SAVE ON LOCALSTORAGE
            storage.setItem("votes_user", JSON.stringify(votes_user));
        }
        storage.setItem("tv_shows_count_ts", new Date().getTime());
        setCacheInfo();
        search_mode = false;

    } else {
        search_mode = true;
        search_result = tvshows;
    }

    setTvShows(tvshows, votes_user);
}

function tvShowsNewFailure(data) {

    console.error(JSON.stringify(data));
    alert(data.message);

}

function catalogueSuccess(data) {

    if (DEBUG) { console.info(JSON.stringify(data)); }

    $.each(data.payload, function (index, value) { // eslint-disable-line no-unused-vars
        $("#media").append('<option value="' + value.name + '">' + value.label + '</option>');
    });

    storage.setItem("media_catalogue", JSON.stringify(data.payload));
}

function catalogueFailure(data) {

    var media_catalogue;

    console.error("Error during retrieving media catalogue. Trying to retrieving from cache...");
    console.error(JSON.stringify(data));

    media_catalogue = JSON.parse(storage.getItem("media_catalogue"));
    $.each(media_catalogue, function (index, value) { // eslint-disable-line no-unused-vars
        $("#media").append('<option value="' + value.name + '">' + value.label + '</option>');
    });
}

function getTvShows(use_cache) {

    var search = $("#movie_search").val().trim();
    if (search.length >= 4) {
        search_mode = true;
    } else {
        search = "";
    }

    if (icarusi_user === undefined || icarusi_user === "" || icarusi_user === null) {
        alert("You must be logged in for accessing movies!!");
        return false;
    }

    if (!use_cache) {

        var data = {"username": icarusi_user,
            "firebase_id_token": storage.getItem("firebase_id_token"),
            "current_page": current_page,
            "method": "POST",
            "url": "/getTvShows3",
            "lazy_load": lazy_load,
            "cB": generic_json_request_new,
            "query": search,
            "successCb": tvShowsNewSuccess,
            "failureCb": tvShowsNewFailure,
            };
        encrypt_and_execute(getX(), "kanazzi", data);
        //encryptText2(getX(), "getTvShowsGo");

    } else {
        var tvshows = storage.getItem("tv_shows"),      // GET FROM LOCALSTORAGE
            votes_user = storage.getItem("votes_user");

        if (tvshows !== "" && tvshows !== undefined && tvshows !== null && votes_user !== "" && votes_user !== undefined && votes_user !== null) {
            setTvShows(JSON.parse(tvshows), JSON.parse(votes_user));
        } else {
            getTvShows(false);
        }
    }
}

/*
function getTvShowsGo() { // eslint-disable-line no-unused-vars

    loading(true, 'Loading movies...');

    $("#movies-list").empty();
    $("#series-list").empty();
    $("#movies-list_nw").empty();
    $("#top-list-movies").empty();
    $("#top-list-voters").empty();
    $("#ct-movies").empty();

    //if (DEBUG) console.info("iCarusi App============> ----------------> " + kanazzi + " <---------------");

    $.ajax({
        url: BE_URL + "/getTvShows",
        method: "POST",
        dataType: "json",
        data: {
            username: icarusi_user,
            kanazzi: kanazzi,
        },
    })
        .done(function (data) {

            var response = JSON.parse(data.payload),
                tvshows = response.tvshows,
                votes_user = response.votes_user;

            storage.setItem("tv_shows", JSON.stringify(tvshows));       // SAVE ON LOCALSTORAGE
            storage.setItem("tv_shows_count_ts", new Date().getTime());
            storage.setItem("votes_user", JSON.stringify(votes_user));

            setCacheInfo();

            setTvShows(tvshows, votes_user);
        })
        .fail(function (err) {
            if (DEBUG) { console.error("error " + err.responseText); }
            $("#movies_content").html('<br/><span style="color:red; text-align:center">Error during song loading...<br/>Tiricci Pippo !!</span>');
        })
        .always(function () {
            loading(false, '');
            //if (DEBUG) console.info("iCarusi App============> ajax call completed");
        });
}
*/

/***
CT MOVIES
***/

function checkMoviesCT() {

    var ct_movies = storage.getItem("baracca"),
        ul_ct_size = $('#ct-movies li').length; //CHECK WHETHER THE UL IS ALREADY POPULATED

    if (ct_movies !== "" && ul_ct_size > 1) {
        if (DEBUG) { console.info("iCarusi App============> Skipping CT movies rebuild..."); }
        return false;
    }

    if (ct_movies === "" || ct_movies === "undefined" || ct_movies === null) {
        if (DEBUG) { console.info("iCarusi App============> No cache for CT movies... going to retrieve from remote server..."); }
        getMoviesCT();
    } else {
        ct_movies = JSON.parse(ct_movies);
        if (DEBUG) { console.info("iCarusi App============> Data cached found for CT movies... data retireved from localstorage... Size: " + ct_movies.length); }
        setCtMovies(ct_movies, true, false);
    }
}

function setCtMovies(data, cached, by_search) { // eslint-disable-line no-unused-vars

    var header_content,
        content,
        movie_str;

    $('#ct-movies').empty();

    if (cached) {
        ct_movies = data;
    }

    data.sort(function (a, b) {
        if (a.title < b.title) {
            return -1;
        }
        if (a.title > b.title) {
            return 1;
        }
        return 0;
    });

    if (data.length === 1) {
        movie_str = "movie";
    } else {
        movie_str = "movies";
    }

    header_content = '<li data-role="list-divider" data-theme="b" style="text-align:center">';
    header_content += '<span style="color:yellow">' + data.length + '</span>&nbsp;' + movie_str + ' found</li>';

    $('#ct-movies').append(header_content);

    $.each(data, function (index, value) { // eslint-disable-line no-unused-vars
        content = '<li style="white-space:normal;">';
        content += '<a data-transition="slide" href="javascript:setPopupCT(' + value.id + ')">';
        content += '<div style="font-size:11px">';
        content += '<b>' + value.title + '</b><br/><span style="font-style:italic">' + value.director + '</span>';
        content += '<span style="color:red; float:right">' + value.year + " - " + value.cinema + '</span>';
        content += '</div>';
        content += '</li>';
        content += '</a>';
        $('#ct-movies').append(content);
    });

    $("#ct-movies").listview('refresh');
}

function getMoviesCT() {

    $.ajax({
        url: BE_URL + "/moviesct",
        method: "GET",
        dataType: "json"
    })
        .done(function (data) {
            storage.setItem("baracca", JSON.stringify(data.payload));
            ct_movies = data.payload;            // IT'S ME
            setCtMovies(data.payload, false, false);
        })
        .fail(function () {
            alert("Server Error");
        })
        .always(function () {
            loading(false, '');
        });
}


function setPopupCT(id) { // eslint-disable-line no-unused-vars

    if (id === undefined) {
        return false;
    }

    if (DEBUG) { console.info("iCarusi App============> Id to open.. " + id); }

    $("#popupMovieCt").panel("open");
    var content = '',
        temp = ct_movies,
        result;

    result = $.grep(temp, function (element, index) { // eslint-disable-line no-unused-vars
        return (element.id === id);
    });

    content = '<span style="font-size:14px; font-weight:bold">' + result[0].title + "</span><br/><br/>";
    content += "Directed by: <i><b>" + result[0].director + "</b></i><br/><br/>";
    content += 'Cast:<br/><span style="width:65%; font-style:italic; font-weight:bold">' + result[0].cast + '</span><br/><br/>';
    content += 'Year: <b>' + result[0].year + '</b><br/><br/>';
    content += 'Cinema: <b>' + result[0].cinema + '</b><br/><br/>';
    content += '<span style="font-weight:bold">FilmTV:</span><br/>';

    if (result[0].filmtv.indexOf("A") === 0) {
        content += '<img src="images/green.png" style="width:60px"/>';
    } else if (result[0].filmtv.indexOf("B") === 0) {
        content += '<img src="images/blue.png" style="width:60px"/>';
    } else if (result[0].filmtv.indexOf("C") === 0) {
        content += '<img src="images/red.png" style="width:60px"/>';
    }

    content += '<br/><br/><br/><span style="font-style:italic;">Tap outside the panel for close</span>';

    $("#movie-table-custom").html(content);
}

 /***
    SAVE NEW MOVIE
 ***/

$(document).on("click", "#send_movie_btn", function () {
    encryptText2(getX(), "saveMovieNew");
});

function saveMovieNew() { // eslint-disable-line no-unused-vars

    // TRICK
    $('#media').selectmenu('enable');
    $('#tvshow_type').selectmenu('enable');
    // END TRICK
    $("#username").val(icarusi_user);
    $("#kanazzi").val(kanazzi);
    $("#id").val(currentId);

    var title = $("#title").val(),
        media = $("#media :selected").val(),
        serie_season = $("#serie_season").val(),
        type = $("#tvshow_type :selected").val(),
        new_pic = $("#pic").val(),
        the_form = $("#movie_form"),
        formData = new FormData(the_form[0]);

    if (icarusi_user === "" || icarusi_user === undefined || icarusi_user === null) {
        alert("You must be logged in for saving or updating Movies/Serie");
        return false;
    }

    if (curr_file_size > 512000) {
        alert("File size exceeded! Max 500KB");
        return false;
    }

    if (title === "" || title === undefined || title === null || media === "" || media === undefined || media === null || type === "" || type === undefined || type === null) {
        alert("Title, media and type cannot be blank!!\nTitle: " + title + "\nMedia: " + media + "\nType: " + type);
        return false;
    }

    if ($("#curr_pic").val() !== "" && new_pic !== "") {
        if (!confirm("Warning! The image you're going to upload will replace the existing one.\n\nAre you sure?")) {
            return false;
        }
    }

    if (serie_season === "" || isNaN(serie_season) || !Number.isInteger(parseFloat(serie_season)) || parseInt(serie_season, 10) <= 0) { // parseInt truncate
        alert("Invalid value for season: " + serie_season);
        return false;
    }

    loading(true, 'Submitting movie...');

    $.ajax({
        url: BE_URL + "/savemovienew",
        method: "POST",
        data: formData,
        cache: false,
        contentType: false,
        processData: false
    })
        .done(function (data) {

            var response = data;

            if (response.result === "failure") {
                alert(response.message);
                return false;
            } else if (response.upload_result.result === "failure") {
                alert(response.upload_result.message);
            } else {
                resetPopupElements();
                getTvShows(false);
                currentId = 0;
                $.mobile.back();
            }
            if (DEBUG) { console.info(JSON.stringify(response)); }

        })
        .fail(function (err) {
            alert("Server error!");
            console.error(err.responseText);
        })
        .always(function () {
            loading(false, "");
        });
}

/***
    DELETE
***/

$(document).on("click", "#delete_movie_btn", function () {
    if (confirm("Are you sure?")) {
        encryptText2(getX(), "deleteMovie");
    }
});

function deleteMovie() { // eslint-disable-line no-unused-vars

    if (icarusi_user === "" || icarusi_user === undefined || icarusi_user === null) {
        alert("You must be logged in for deleting Movies/Serie");
        return false;
    }

    loading(true, 'Submitting movie...');

    $.ajax({
        url: BE_URL + "/deletemovie",
        method: "POST",
        data: {
            id: currentId,
            username: icarusi_user,
            kanazzi: kanazzi,
        },
    })
        .done(function (data) {
            var response = data;
            if (DEBUG) {
                console.info("iCarusi App============> ========> " + response.result);
                console.info("iCarusi App============> ========> " + response.message);
            }

            if (response.result === "failure") {
                alert(response.message);
                return false;
            }

            resetPopupElements();
            getTvShows(false);
            currentId = 0;

            $.mobile.back(); //NEW

        })
        .fail(function (err) {
            alert("Server error!");
            console.error(err.responseText);
        })
        .always(function () {
            loading(false, '');
        });
}

function newMoviePage() { // eslint-disable-line no-unused-vars
    $(':mobile-pagecontainer').pagecontainer('change', '#detail_page');
    resetPopupElements();
}

/***
 SET DETAILS PAGE
***/

function setPopupData(id, src) { // eslint-disable-line no-unused-vars
    //OLD
    //$("#popupMovie").popup("open");

    // NEW
    $(':mobile-pagecontainer').pagecontainer('change', '#detail_page');
    resetPopupElements();
    //END NEW

    $("#nw").prop("checked", false).checkboxradio("refresh");
    $('#giveup').checkboxradio('enable');

    currentId = id;

    var item = jsonTvShows[id],
        vote,
        episode,
        //season,
        comment,
        nw,
        collapse_vote,
        additional_info;

    if (DEBUG) {
        console.info("iCarusi App============> Set Popup Data for movie id: " + id);
        console.info("iCarusi App============> " + item.title + " ** " + item.media + " ** " + item.username + " ** " + item.avg_vote);
        console.info("iCarusi App============> " + JSON.stringify(item.u_v_dict));
    }

    if (!(icarusi_user in item.u_v_dict)) {
        vote = 5;
        episode = 1;
        //season = 1;
        comment = '';
        if (DEBUG) { console.info("iCarusi App============> User " + icarusi_user + " has not voted for this movie. Setting default value to: " + vote); }
    } else {
        vote = item.u_v_dict[icarusi_user].us_vote;
        nw = item.u_v_dict[icarusi_user].now_watching;
        episode = item.u_v_dict[icarusi_user].episode;
        //season = item.u_v_dict[icarusi_user].season;
        comment = item.u_v_dict[icarusi_user].comment;
        if (nw) {
            $("#nw").prop("checked", true).checkboxradio("refresh");
        }
        if (DEBUG) { console.info("iCarusi App============> Vote for user " + icarusi_user + " = " + vote + " (Now watching: " + nw + ")"); }
    }

    $("#top_title").html('<span style="text-align:center; vertical-align:middle">' + item.title + '</span>');
    $("#title").val(item.title);
    $("#link").val(item.link);
    $("#serie_season").val(item.serie_season);
    $('#media').val(item.media).selectmenu('refresh', true);
    $('#tvshow_type').val(item.tvshow_type).selectmenu('refresh', true);
    $("#curr_pic").val(item.poster);
    $("#vote").val(vote).slider("refresh");
    $("#the_votes_d").show();
    $("#episode").val(episode);
    $("#season").val(item.serie_season);
    $("#comment").val(comment);
    $("#curr_link").val(item.link);

    if (item.link === "") {
        $("#btn_link").hide();
    }

    if (icarusi_user === "" || icarusi_user === undefined || icarusi_user === null) {
        $("#send_movie_btn").addClass("ui-btn ui-state-disabled");
        $("#delete_movie_btn").addClass("ui-btn ui-state-disabled");
    }

    collapse_vote = $("#the_votes_d").collapsible("option", "collapsed");
    if (collapse_vote === false) {
        $("#the_votes_d").collapsible("option", "collapsed", "true");
    }

    additional_info = $("#additional_info").collapsible("option", "collapsed");
    if (additional_info === false) {
        $("#additional_info").collapsible("option", "collapsed", "true");
    }

    if (icarusi_user !== item.username) {

        $("#title").prop('readonly', true);
        //$("#link").prop('readonly', true);             // new feature to allow not owner to edit the link
        $("#title").textinput("option", "clearBtn", false);
        $("#link").textinput("option", "clearBtn", false);
        $("#title").textinput("refresh");
        $("#link").textinput("refresh");
        $('#media').selectmenu('disable');
        $('#tvshow_type').selectmenu('disable');
        $('#media').prop("readonly", true);
        $('#tvshow_type').prop("readonly", true);
        $("#send_movie_btn").text("Vote...");
        //$("#pic").addClass("ui-btn ui-state-disabled");       // new feature to allow not movier owner to upload the poster
        $("#delete_movie_btn").addClass("ui-btn ui-state-disabled");
    } else {
        $("#send_movie_btn").text("Update...");
        $("#send_movie_btn").removeClass("ui-state-disabled");
        $("#delete_movie_btn").removeClass("ui-state-disabled");
    }

    $('#users_votes').empty();
    $.each(item.u_v_dict, function (index, value) { // eslint-disable-line no-unused-vars
        var content = '<li style="white-space:normal;">';
        if (value.now_watching === true) {
            content += '<b>' + value.us_username + '</b> <span style="color:red; float:right">now watching...</span>';
        } else {
            content += '<b>' + value.us_username + '</b> <span style="color:red; float:right">' + value.us_vote + '</span>';
            content += '<br/><p style="white-space:normal; font-style:italic">' + value.comment + '</p>';
        }
        content += '</li>';
        $('#users_votes').append(content);
    });
    $('#users_votes').listview('refresh');
}

/***
 SET COMMENTS PAGE
***/

function setComments(id, src) { // eslint-disable-line no-unused-vars

    // NEW
    $(':mobile-pagecontainer').pagecontainer('change', '#comments_page');
    //END NEW

    var item = jsonTvShows[id],
        comments_count,
        content,
        header_content;

    if (DEBUG) { console.info("iCarusi App============> " + item.title + " ** " + item.media + " ** " + item.username + " ** " + item.avg_vote); }
    currentId = id;

    $("#top_title_comments").html("iCarusi's reviews <br/><i>" + item.title + "</i>");

    if (DEBUG) { console.info("iCarusi App============> " + JSON.stringify(item.u_v_dict)); }

    $('#movie_comments').empty();

    comments_count = 0;
    $.each(item.u_v_dict, function (index, value) { // eslint-disable-line no-unused-vars
        content = '<li style="white-space:normal;">';
        if (value.comment !== "") {
            comments_count += 1;
        }

        if (value.now_watching === true) {
            content += '<b>' + value.us_username + '</b> <span style="color:red; float:right">now watching...</span>';
        } else {
            content += '<b>' + value.us_username + '</b> <span style="color:red; float:right">' + value.us_vote + '</span>';
            content += '<br/><p style="white-space:normal; font-style:italic; font-size:12px">' + value.comment + '</p>';
        }
        content += '</li>';
        $('#movie_comments').append(content);
    });

    header_content = '<li data-role="list-divider" data-theme="b" style="text-align:center">';
    header_content += '<span style="color:yellow">' + comments_count + ' comments...</span></li>';
    $('#movie_comments').prepend(header_content);
    $('#movie_comments').listview('refresh');
}


function open_link(link) { // eslint-disable-line no-unused-vars
    if (link !== "") {
        cordova.InAppBrowser.open(link, '_self', 'location=no');
    }
}

// CORDOVA
function onDeviceReady() { // eslint-disable-line no-unused-vars

    icarusi_user = storage.getItem("icarusi_user");
    tv_shows_storage = storage.getItem("tv_shows");
    tv_shows_storage_ts = storage.getItem("tv_shows_count_ts");
    device_app_path = cordova.file.applicationDirectory;
    if (DEBUG) {
        console.info("iCarusi App============> Found Tv Shows Storage");
        console.info("iCarusi App============> Tv Shows Storage datetime " + tv_shows_storage_ts);
    }

    var networkState = navigator.connection.type;

    $("#connection").html("");

    if (icarusi_user === power_user) {
        $("#sabba_info").html(BE_URL);
    }

    if (!lazy_load) {
        $("#movie_list_footer").hide();
        $("#serie_list_footer").hide();
    }

     /*
     * ASYNC POPULATE MEDIA TYPE
     */
    var data = {"username": icarusi_user,
        "firebase_id_token": storage.getItem("firebase_id_token"),
        "method": "POST",
        "url": "/getcatalogue",
        "cat_type": "media_type",
        "cB": generic_json_request_new,
        "successCb": catalogueSuccess,
        "failureCb": catalogueFailure,
     };
     encrypt_and_execute(getX(), "kanazzi", data);

    /*
    console.info("===============================================");
    var location = window.location;
    console.info("RECEIVED LOCATION " + location);

    if (location !== "") {
        q = parseQuery(location);
        console.info(JSON.stringify(q));
    }
    console.info("===============================================");
    */

    /*
     * OFFLINE MODE CHECKER
     */

    if (networkState === Connection.NONE) {
        $("#connection").html("No network... Pantalica mode...");

        checkMoviesCT();

        if (tv_shows_storage !== "" && tv_shows_storage !== undefined && tv_shows_storage !== null) {
            if (DEBUG) { console.info("iCarusi App============> Found Tv Shows Storage"); }
            getTvShows(true);
        }
    } else if (!lazy_load && !is_storage_expired_or_invalid("tv_shows", "tv_shows_count_ts", 86400)) {
            getTvShows(true);
    } else {
            getTvShows(false);
    }

    /*
     *  BINDINGS
     */
    $('#pic').bind('change', function () {
        var size = this.files[0].size,
            sizekb = this.files[0].size / 1024;

        curr_file_size = size;

        if (size <= 512000) {
            $("#upload_result").html('<span style="color:green">File size (' +  sizekb.toFixed(2) + " KB) OK !</span>");
        } else {
            $("#upload_result").html('<span style="color:red">File size (' +  sizekb.toFixed(2) + " KB) not OK! Max 500 KB! </span>");
        }
    });

    $("#popupPhotoPortrait").bind({
        popupafteropen: function (event, ui) { // eslint-disable-line no-unused-vars
            if (DEBUG) { console.info("iCarusi App============> Opening Picture Popup -> "); }
        },
        popupafterclose: function (event, ui) { // eslint-disable-line no-unused-vars
            if (DEBUG) { console.info("iCarusi App============> Closing Picture Popup -> Resetting picture src"); }
        }
    });

    /*
     * BUTTONS ACTIONS
     */

    $("#btn_d_reload").on("click", function () {
        $("#movie_search").val("");
        $("#movie_list_footer").hide();
        current_page = 1;
        append_mode = false;
        search_mode = false;
        getTvShows(false);
    });

    $("#btn_t_sort").on("click", function () {
        sort_type = "title";
        sort_movies();
    });

    $("#btn_d_sort").on("click", function () {
        sort_type = "datetime_sec";
        sort_movies();
    });

    $("#btn_m_sort").on("click", function () {
        sort_type = "media";
        sort_movies();
    });

    $("#btn_v_sort").on("click", function () {
        sort_type = "avg_vote";
        sort_movies();
    });


    /*
     * CT SEARCH
     */

    /*

    $('#ct_search').on('change', function () {
        var search = $("#ct_search").val();
        if (search.length === 0) {
            setCtMovies(ct_movies, false, true);
            return false;
        }
    });


    $("#ct_search").bind("input", function () {
        var search = $("#ct_search").val(),
            result = ct_movies;

        if (search.length === 0) {
            setCtMovies(ct_movies, false, true);
            return false;
        }

        if (search.length < 4) {
            return false;
        }

        result = $.grep(result, function (element, index) { // eslint-disable-line no-unused-vars
            return (
                (element.year.toString() === search) ||
                (element.title.toUpperCase().indexOf(search.toUpperCase()) >= 0) ||
                (element.cinema.toUpperCase().indexOf(search.toUpperCase()) >= 0) ||
                (element.director.toUpperCase().indexOf(search.toUpperCase()) >= 0)
            );
        });
        setCtMovies(result, false, true);
    });
    */

    /*
     * SERIE SEASON
     */

    $('#serie_season').on('change', function () {
        $('#season').val($('#serie_season').val());
    });

    /*
     * MOVIE SEARCH
     */


    $('#movie_search').on('change', function () {

        var search = $("#movie_search").val().trim();
        if (search.length === 0) {
            search_mode = false;
        }

        /*
        if (lazy_load) {
            getTvShows(false);
        } else {
            var search = $("#movie_search").val();
            if (search.length === 0 && !is_storage_expired_or_invalid("tv_shows", "", 0) && !is_storage_expired_or_invalid("votes_user", "", 0)) {
                search_mode = false;
                setTvShows(JSON.parse(storage.getItem("tv_shows")), JSON.parse(storage.getItem("votes_user")));
            }
        }
        */
    });

    $("#movie_search").bind("input", function () {

        var tvshows = storage.getItem("tv_shows"), // GET FROM LOCALSTORAGE
            votes_user = storage.getItem("votes_user"),
            search = $("#movie_search").val(),
            result;

        if (tvshows === "" || tvshows === undefined || tvshows === null || votes_user === "" || votes_user === undefined || votes_user === null) {
            return false;
        }

        result = JSON.parse(tvshows);
        votes_user = JSON.parse(votes_user);

        if (search.length === 0) {
            search_mode = false;
            if (lazy_load) {
                getTvShows(false);
            } else if (!is_storage_expired_or_invalid("tv_shows", "", 0) && !is_storage_expired_or_invalid("votes_user", "", 0)) {
                setTvShows(JSON.parse(storage.getItem("tv_shows")), JSON.parse(storage.getItem("votes_user")));
            } else {
                getTvShows(false);
            }
        }

        if (search.trim().length < 4) {
            return false;
        }

        if (lazy_load) {

            search_mode = true;
            append_mode = false;

            var data = {"username": icarusi_user,
                "firebase_id_token": storage.getItem("firebase_id_token"),
                "method": "POST",
                "url": "/getTvShows3",
                "cB": generic_json_request_new,
                "successCb": tvShowsNewSuccess,
                "failureCb": tvShowsNewFailure,
                "query": search.trim()
                };
            encrypt_and_execute(getX(), "kanazzi", data);

        } else {

            result = $.grep(result, function (element, index) { // eslint-disable-line no-unused-vars
                return (
                    (element.title.toUpperCase().indexOf(search.toUpperCase()) >= 0) ||
                    (element.media.toUpperCase().indexOf(search.toUpperCase()) >= 0) ||
                    (element.username.toUpperCase().indexOf(search.toUpperCase()) >= 0)
                );
            });
            setTvShows(result, votes_user);
        }
    });

    /*
     * SHOW ME MORE
     */

    function show_me_more() {
        $("#movie_list_footer").hide();
        $("#serie_list_footer").hide();

        var search = $("#movie_search").val().trim();

        if (search_mode && search.length < 4) {
            search = "";
        }

        current_page += 1;
        append_mode = true;
        var data = {"username": icarusi_user,
            "firebase_id_token": storage.getItem("firebase_id_token"),
            "current_page": current_page,
            "query": search,
            "method": "POST",
            "url": "/getTvShows3",
            "cB": generic_json_request_new,
            "successCb": tvShowsNewSuccess,
            "failureCb": tvShowsNewFailure,
            };
        encrypt_and_execute(getX(), "kanazzi", data);
    }

    $("#btn_show_more").on("click", function () {
        show_me_more();
    });

    $("#btn_show_more_2").on("click", function () {
        show_me_more();
    });

    /*
    window.onscroll = function() {

    };
    */


    /*
     * PULL DOWN REFRESH
     */

    function pullDownActions() {
        current_page = 1;
        $("#movie_search").val("");
        $("#movie_list_footer").hide();
        $("#serie_list_footer").hide();
        append_mode = false;
        search_mode = false;
        getTvShows(false);
    }

    PullToRefresh.init({
        mainElement: '#movies-list',
        onRefresh: function () {
            pullDownActions();
        },
        instructionsReleaseToRefresh: "Pull down for get fresh data from remote server...",
        distThreshold : 20,
    });

    PullToRefresh.init({
        mainElement: '#series-list',
        onRefresh: function () {
            pullDownActions();
        },
        instructionsReleaseToRefresh: "Pull down for get fresh data from remote server...",
        distThreshold : 20,
    });

    PullToRefresh.init({
        triggerElement: '#movies-list_nw',
        onRefresh: function () {
            pullDownActions();
        },
        instructionsReleaseToRefresh: "Pull down for get fresh data from remote server...",
        distThreshold : 20,
    });

    /*
     * SWIPE RUDIMENTALE
     */

    $("#movies_page").on("swipeleft", swipeleftHandler);
    $("#movies_page").on("swiperight", swipeRightHandler);

    function swipeleftHandler(event) { // eslint-disable-line no-unused-vars
        document.location = swipe_left_target;
    }

    function swipeRightHandler(event) { // eslint-disable-line no-unused-vars
        document.location = swipe_right_target;
    }

    /*
     * INITIALIZATION
     */

    $("#top-list-movies").listview('refresh');
    $("#top-list-voters").listview('refresh');


}  // CORDOVA
