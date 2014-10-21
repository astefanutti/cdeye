var xhr = new XMLHttpRequest();
xhr.open("GET", "cdeye/beans");
xhr.setRequestHeader('Accept', 'application/json');
xhr.onreadystatechange = function(event) {
    if(xhr.readyState === 4)
        if (xhr.status === 200)
            display();
        else
            alert("CDEye not accessible!");
};
xhr.send();

function display() {
    var beans = JSON.parse(xhr.responseText);

//    var div = document.getElementById("beans");

    var nodes = [];

//    div.innerHTML = "";
    for (var i = 0; i < beans.bean.length; i++) {
//        div.innerHTML += beans.bean[i].className + "<br/>";
        nodes.push({name:beans.bean[i].classSimpleName, width:200, height:40});
    }

    console.info(nodes);

//    d3.json("smallgrouped.json", function (error, graph) {
//        console.info(graph.nodes);
//    });

    var color = d3.scale.category20();

    var d3cola = cola.d3adaptor()
        .linkDistance(100)
        .avoidOverlaps(true)
        .handleDisconnected(false)
        .size([800, 800]);

    var svg = d3.select("body").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("preserveAspectRatio", "xMidYMid")
        .attr("viewBox", "0 0 " + (800) + " " + (800))
        .attr("pointer-events", "all");
        //.call(d3.behavior.zoom().on("zoom", redraw));

    svg.append('rect')
        .attr('class', 'background')
        .attr('width', "100%")
        .attr('height', "100%")
        .call(d3.behavior.zoom().on("zoom", redraw));

    var container = svg.append('g');

    function redraw() {
        container.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    d3cola
        .nodes(nodes)
//        .links(graph.links)
//        .groups(graph.groups)
        .start();

//        var group = svg.selectAll(".group")
//            .data(graph.groups)
//            .enter().append("rect")
//            .attr("rx", 8).attr("ry", 8)
//            .attr("class", "group")
//            .style("fill", function (d, i) { return color(i); });

//        var link = svg.selectAll(".link")
//            .data(graph.links)
//            .enter().append("line")
//            .attr("class", "link");

    var margin = 10, pad = 12;

    var node = container.selectAll(".node")
        .data(nodes)
        .enter().append("rect")
        .attr("class", "node")
        .attr("width", function (d) { return d.width - 2 * pad; })
        .attr("height", function (d) { return d.height - 2 * pad; })
        .attr("rx", 5).attr("ry", 5)
        .style("fill", function (d) { return color( /*graph.groups.length*/ 3); })
        .call(d3cola.drag);

    var label = container.selectAll(".label")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .text(function (d) { return d.name; })
        .call(d3cola.drag)
        .each(function (d) {
            var b = this.getBBox();
            var extra = 2 * margin + 2 * pad;
            d.width = b.width + extra;
            d.height = b.height + extra;
        });

    //node.append("title")
    //    .text(function (d) { return d.name; });

    d3cola.on("tick", function () {
//        link.attr("x1", function (d) { return d.source.x; })
//            .attr("y1", function (d) { return d.source.y; })
//            .attr("x2", function (d) { return d.target.x; })
//            .attr("y2", function (d) { return d.target.y; });
        node.each(function (d) { d.innerBounds = d.bounds.inflate(-margin); })
            .attr("x", function (d) { return d.innerBounds.x; })
            .attr("y", function (d) { return d.innerBounds.y; })
            .attr("width", function (d) { return d.innerBounds.width(); })
            .attr("height", function (d) { return d.innerBounds.height(); });
        //node.attr("x", function (d) { return d.x - d.width / 2 + pad; })
        //    .attr("y", function (d) { return d.y - d.height / 2 + pad; })
//            .attr("width", function (d) { return d.width; })
//            .attr("height", function (d) { return d.height; });
//        group.attr("x", function (d) { return d.bounds.x; })
//            .attr("y", function (d) { return d.bounds.y; })
//            .attr("width", function (d) { return d.bounds.width(); })
//            .attr("height", function (d) { return d.bounds.height(); });
        label.attr("x", function (d) { return d.x; })
            //.attr("y", function (d) { var h = this.getBBox().height;return d.y + h/4;});
        .attr("y", function (d) { return d.y + (margin + pad) / 2 });
    });
}