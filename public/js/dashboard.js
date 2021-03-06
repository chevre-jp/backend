/**
 * ダッシュボードを表現するためのjs
 */
var PROJECT_ID = $('input[name="projectId"]').val();

var orders = [];
var searchedAllOrders = false;
var limit = 10;
var page = 0;

$(function () {
    // Fix for charts under tabs
    $('.box ul.nav a').on('shown.bs.tab', function () {
        // area.redraw()
        // donut.redraw()
        // line.redraw()
    })

    updateCharts();
    setInterval(
        function () {
            updateCharts();
        },
        60000
    );
});

function updateCharts() {
    searchProjects(function () {
    });
}

function searchProjects(cb) {
    $.getJSON(
        '/dashboard/projects',
        {
            limit: 100,
            page: 1,
        }
    ).done(function (data) {
        console.log(data);
        $('.projects tbody').empty();

        $.each(data.data, function (_, project) {
            var html = '<td><a href="/dashboard/projects/' + project.id + '/select">' + project.name + '</a></td>'
            $('<tr>').html(html)
                .appendTo('.projects tbody');
        });

        cb();
    }).fail(function (jqXHR, textStatus, error) {
        console.error('プロジェクトを検索できませんでした', jqXHR);
        $('<p>').addClass('display-4 text-danger')
            .text(textStatus)
            .appendTo('.projects tbody');
    });
}
