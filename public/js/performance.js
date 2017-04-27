/**
 * 1時間の高さ
 * @const HOUR_HEIGHT
 */
var HOUR_HEIGHT = 60;

/**
 * スクリーンの幅
 * @const SCREEN_WIDTH
 */
var SCREEN_WIDTH = 160;

$(function () {
    // 検索
    $(document).on('click', '.search-button', function (event) {
        event.preventDefault();
        search();
    });
    // 新規作成
    $(document).on('click', '.add-button', function (event) {
        event.preventDefault();
        add();
    });
    // 編集
    $(document).on('click', '.performance', function (event) {
        event.preventDefault();
        var target = $(this).find('.inner');
        edit(target);
    });

    // 作品検索
    $(document).on('click', '.film-search-button', function (event) {
        event.preventDefault();
        filmSearch();
    });

    // 作品選択
    $(document).on('click', '.film-select-button', function (event) {
        event.preventDefault();
        filmSelect();
    });

    // 新規登録（確定）
    $(document).on('click', '.regist-button', function (event) {
        event.preventDefault();
        regist();
    });

    // 更新（確定）
    $(document).on('click', '.update-button', function (event) {
        event.preventDefault();
        update();
    });
});

/**
 * 新規登録（確定）
 * @function register
 * @returns {void}
 */
function regist() {
    var modal = $('#newModal');
    var theater = modal.find('input[name=theater]').val();
    var screen = modal.find('select[name=screen]').val();
    var day = modal.find('input[name=day]').val();
    var film = modal.find('input[name=film]').val();
    var openTime = modal.find('select[name=openTimeHour]').val() + modal.find('select[name=openTimeMinutes]').val();
    var startTime = modal.find('select[name=startTimeHour]').val() + modal.find('select[name=startTimeMinutes]').val();
    var endTime = modal.find('select[name=endTimeHour]').val() + modal.find('select[name=endTimeMinutes]').val();
    if (theater === ''
        || screen === ''
        || day === ''
        || film === ''
        || openTime === ''
        || startTime === ''
        || endTime === '') {
        alert('情報が足りません');
        return;
    }
    $.ajax({
        dataType: 'json',
        url: '/master/performance/regist',
        type: 'POST',
        data: {
            theater: theater,
            screen: screen,
            day: day,
            film: film,
            openTime: openTime,
            startTime: startTime,
            endTime: endTime
        }
    }).done(function (data) {
        if (!data.error) {
            modal.modal('hide');
            search();
            return;
        }
        alert('登録に失敗しました');
    }).fail(function (jqxhr, textStatus, error) {
        console.error(jqxhr, textStatus, error);
        alert('登録に失敗しました');
    });
}

/**
 * 更新（確定）
 * @function update
 * @returns {void}
 */
function update() {
    var modal = $('#editModal');
    var performance = modal.find('input[name=performance]').val();
    var screen = modal.find('select[name=screen]').val();
    var openTime = modal.find('select[name=openTimeHour]').val() + modal.find('select[name=openTimeMinutes]').val();
    var startTime = modal.find('select[name=startTimeHour]').val() + modal.find('select[name=startTimeMinutes]').val();
    var endTime = modal.find('select[name=endTimeHour]').val() + modal.find('select[name=endTimeMinutes]').val();
    if (performance === ''
        || screen === ''
        || openTime === ''
        || startTime === ''
        || endTime === '') {
        alert('情報が足りません');
        return;
    }
    $.ajax({
        dataType: 'json',
        url: '/master/performance/update',
        type: 'POST',
        data: {
            performance: performance,
            screen: screen,
            openTime: openTime,
            startTime: startTime,
            endTime: endTime
        }
    }).done(function (data) {
        if (!data.error) {
            modal.modal('hide');
            search();
            return;
        }
        alert('更新に失敗しました');
    }).fail(function (jqxhr, textStatus, error) {
        console.error(jqxhr, textStatus, error);
        alert('更新に失敗しました');
    });
}

/**
 * 検索
 * @function search
 * @returns {void}
 */
function search() {
    var theater = $('.search select[name=theater]').val();
    var day = $('.search select[name=day]').val();
    if (!theater || !day) {
        alert('劇場、上映日を選択してください');
        return;
    }
    $.ajax({
        dataType: 'json',
        url: '/master/performance/search',
        type: 'POST',
        data: {
            theater: theater,
            day: day
        }
    }).done(function (data) {
        if (data) {
            create(data.screens, data.performances);
            modalInit(theater, day, data.screens);
        }
    }).fail(function (jqxhr, textStatus, error) {
        console.error(jqxhr, textStatus, error);
    });
}

/**
 * モーダル初期化
 */
function modalInit(theater, day, screens) {
    var screenDom = [];
    screenDom.push('<option value="">選択してください</option>');
    for (var i = 0; i < screens.length; i++) {
        var screen = screens[i];
        screenDom.push('<option value="' + screen._id + '">' + screen.name.ja + '</option>')
    }

    var newModal = $('#newModal');
    newModal.find('.theater span').text($('select[name=theater] option[value=' + theater + ']').text());
    newModal.find('.day span').text(moment(day).format('YYYY年MM月DD日(ddd)'));
    newModal.find('input[name=theater]').val(theater);
    newModal.find('input[name=day]').val(day);
    newModal.find('select[name=screen]').html(screenDom);

    var editModal = $('#editModal');
    editModal.find('.theater span').text($('select[name=theater] option[value=' + theater + ']').text());
    editModal.find('.day span').text(moment(day).format('YYYY年MM月DD日(ddd)'));
    editModal.find('select[name=screen]').html(screenDom);
}

/**
 * 作品検索
 * @function filmSearch
 * @returns {void}
 */
function filmSearch() {
    var modal = $('#newModal');
    var id = modal.find('input[name=filmId]').val();

    $.ajax({
        dataType: 'json',
        url: '/master/performance/film/search',
        type: 'POST',
        data: {
            id: id
        }
    }).done(function (data) {
        if (data) {
            var film = data.film;

            if (film === undefined) {
                alert('作品がありません');
                return;
            }
            modal.find('.film-name').text(film.name.ja);
            modal.find('.film-name').attr('data-film-id', film._id);
        }
    }).fail(function (jqxhr, textStatus, error) {
        console.error(jqxhr, textStatus, error);
    });

}

/**
 * 作品選択
 * @function filmSelect
 * @returns {void}
 */
function filmSelect() {
    var modal = $('#newModal');
    var film = modal.find('.film-name').attr('data-film-id');
    if (film === '') {
        alert('作品がありません');
        return;
    }
    modal.find('input[name=film]').val(film);
}

/**
 * 新規作成
 * @function add
 * @returns {void}
 */
function add() {
    var theater = $('select[name=theater]').val();
    var day = $('select[name=day]').val();
    if (!theater || !day) {
        alert('劇場、上映日を選択してください');
        return;
    }
    var modal = $('#newModal');
    modal.find('.film-name').text('未選択');
    modal.find('.film-name').attr('data-film-id', '');
    modal.find('input[name=film]').val('');
    modal.find('select[name=openTimeHour]').val('00');
    modal.find('select[name=openTimeMinutes]').val('00');
    modal.find('select[name=startTimeHour]').val('00');
    modal.find('select[name=startTimeMinutes]').val('00');
    modal.find('select[name=endTimeHour]').val('00');
    modal.find('select[name=endTimeMinutes]').val('00');
    modal.find('select[name=screen]').val('');
    $('#newModal').modal();
}

/**
 * 編集
 * @function edit
 * @param {JQuery} target 
 * @returns {void}
 */
function edit(target) {
    var performance = target.attr('data-performance');
    var theater = target.attr('data-theater');
    var day = target.attr('data-day');
    var openTime = target.attr('data-openTime');
    var startTime = target.attr('data-startTime');
    var endTime = target.attr('data-endTime');
    var screen = target.attr('data-screen');
    var film = target.attr('data-film');
    var filmName = target.text();
    var modal = $('#editModal');
    modal.find('input[name=performance]').val(performance);
    modal.find('input[name=theater]').val(theater);
    modal.find('input[name=day]').val(day);
    modal.find('input[name=film]').val(film);

    modal.find('select[name=openTimeHour]').val(openTime.slice(0, 2));
    modal.find('select[name=openTimeMinutes]').val(openTime.slice(2, 4));
    modal.find('select[name=startTimeHour]').val(startTime.slice(0, 2));
    modal.find('select[name=startTimeMinutes]').val(startTime.slice(2, 4));
    modal.find('select[name=endTimeHour]').val(endTime.slice(0, 2));
    modal.find('select[name=endTimeMinutes]').val(endTime.slice(2, 4));
    modal.find('select[name=screen]').val(screen);

    modal.find('.film span').text(filmName);
    modal.modal();
}

/**
 * 作成
 * @function create
 * @param {*} screens 
 * @param {*} performances
 * @returns {void} 
 */
function create(screens, performances) {
    var scheduler = $('.scheduler');
    scheduler.html('');
    var dom = $('<table></table>');
    dom.append(createHeader(screens));
    dom.append(createBody(screens, performances));
    scheduler.append(dom);
}

/**
 * ヘッダー作成
 * @function createHeader
 * @param {*} screens 
 * @returns {JQuery} 
 */
function createHeader(screens) {
    var dom = $('<thead class="header"></thead>');
    dom.append('<td>時間</td>');
    for (var i = 0; i < screens.length; i++) {
        var screen = screens[i];
        dom.append('<td style="width: ' + SCREEN_WIDTH + 'px;">' + screen.name.ja + '</td>');
    }
    return dom;
}

/**
 * 中身作成
 * @function createBody
 * @param {*} screens 
 * @param {*} performances 
 * @returns {JQuery} 
 */
function createBody(screens, performances) {
    var dom = $('<tbody><tr></tr></tbody>');
    dom.find('tr').append(createTime());
    for (var i = 0; i < screens.length; i++) {
        var screen = screens[i];
        var target = performances.filter(function (performance) {
            return (performance.screen === screen._id);
        });
        dom.find('tr').append(createScreen(target));
    }
    return dom;
}

/**
 * 時間作成
 * @function createTime
 * @returns {JQuery} 
 */
function createTime() {
    var dom = $('<td class="times"></td>');
    for (var i = 0; i < 24; i++) {
        var time = ('00' + String(i)).slice(-2) + ':00';
        dom.append('<div class="time" style="height: ' + HOUR_HEIGHT + 'px">' + time + '</div>');
    }
    return dom;
}

/**
 * スクリーン作成
 * @function createScreen 
 * @param {*} performances 
 * @returns {JQuery} 
 */
function createScreen(performances) {
    var dom = $('<td class="screen"></td>');
    for (var i = 0; i < performances.length; i++) {
        var performance = performances[i];
        var startTime = performance.open_time;
        var start = {
            hour: Number(startTime.slice(0, 2)),
            minutes: Number(startTime.slice(2, 4))
        };
        var endTime = performance.end_time;
        var end = {
            hour: Number(endTime.slice(0, 2)),
            minutes: Number(endTime.slice(2, 4))
        };
        var hour = 60;
        var top = (start.hour * HOUR_HEIGHT) + (start.minutes * HOUR_HEIGHT / hour);
        var left = 0;
        // 上映時間から判断するべき
        var height = ((end.hour - start.hour) * HOUR_HEIGHT) + ((end.minutes - start.minutes) * HOUR_HEIGHT / hour);
        var width = 100;
        var style = {
            top: top + 'px',
            left: left + 'px',
            height: height + 'px',
            width: width + '%'
        };

        var performanceDom = $('<div class="performance">' +
            '<div ' +
            'data-performance="' + performance._id + '" ' +
            'data-day="' + performance.day + '" ' +
            'data-openTime="' + performance.open_time + '" ' +
            'data-startTime="' + performance.start_time + '" ' +
            'data-endTime="' + performance.end_time + '" ' +
            'data-screen="' + performance.screen + '" ' +
            'data-theater="' + performance.theater + '" ' +
            'data-film="' + performance.film.id + '" ' +
            'role="button" class="inner">' + performance.film.name.ja + '</div>' +
            '</div>');
        performanceDom.css(style);
        dom.append(performanceDom);
    }
    return dom;
}