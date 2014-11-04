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

    var nodes = [];
    var links = [];

    var ids = [];

    for (var i = 0; i < beans.bean.length; i++) {
        nodes.push({name:beans.bean[i].classSimpleName, width:200, height:40});

        if (beans.bean[i].classSimpleName == "MetricNameStrategyProducer")
            ids.push(i);

        if (beans.bean[i].injectionPoints) {
            for (var j = 0; j < beans.bean[i].injectionPoints.injectionPoint.length; j++) {
                var ip = parseInt(beans.bean[i].injectionPoints.injectionPoint[j].bean);
                links.push({source: ip, target: i});
            }
        }
    }

    var d3cola = cola.d3adaptor()
        .linkDistance(100)
        .avoidOverlaps(true)
        .handleDisconnected(true)
        //.symmetricDiffLinkLengths(5)
        .size([window.innerWidth, window.innerHeight]);

    var svg = d3.select("body").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("preserveAspectRatio", "xMidYMid");

    // define arrow markers for graph links
    svg.append('svg:defs')
        .append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 5)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5L2,0')
        .attr('stroke-width', '0px')
        .attr('fill', '#555');

    var container = svg.append('g');

    svg.call(d3.behavior.zoom().on("zoom", function() {
        container.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }));

    var color = d3.scale.category20();

    var powerGraph = null;
    d3cola.nodes(nodes)
        .links(links)
        //.groups(groups)
        .powerGraphGroups(function (d) {
            powerGraph = d;
            d.groups.forEach(function (v) {
                return v.padding = 10;
            });
        });

    var grp = {id:3, padding:10, "leaves": [nodes[ids[0]], nodes[ids[1]]]};
    grp.leaves.forEach(function (v) {
        v.parent = grp;
    });
    d3cola.groups().push(grp);
    d3cola.rootGroup().groups.push(grp);

    var idx = d3cola.rootGroup().leaves.indexOf(nodes[ids[0]]);
    d3cola.rootGroup().leaves.splice(idx, 1);
    idx = d3cola.rootGroup().leaves.indexOf(nodes[ids[1]]);
    d3cola.rootGroup().leaves.splice(idx, 1);

    var constraints = [{type:"alignment", axis:"x", offsets:[{node: ids[0], offset:0}, {node:ids[1], offset:0}]}];
    d3cola.constraints(constraints);

    var group = container.selectAll(".group")
        .data(d3cola.groups())
//        .data(powerGraph.groups)
        .enter().append("rect")
        .attr("rx", 8).attr("ry", 8)
        .attr("class", "group")
        .style("fill", function (d, i) {
            return color(i);
        });

    var link = container.selectAll(".link")
        .data(powerGraph.powerEdges)
        .enter().append("line")
        .attr("class", "link");

    var margin = 10, pad = 12;

    var node = container.selectAll(".node")
        .data(nodes)
        .enter().append("rect")
        .attr("class", "node")
        .attr("width", function (d) { return d.width + 2 * margin; })
        .attr("height", function (d) { return d.height + 2 * margin; })
        .attr("rx", 5).attr("ry", 5)
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

    d3cola.start();

    d3cola.on("tick", function () {
        node.each(function (d) {
            d.bounds.setXCentre(d.x);
            d.bounds.setYCentre(d.y);
            d.innerBounds = d.bounds.inflate(-margin);
        });

        group.each(function (d) {
            return d.innerBounds = d.bounds.inflate(-margin);
        });

        link.each(function (d) {
            cola.vpsc.makeEdgeBetween(d, d.source.innerBounds, d.target.innerBounds, 5);
        });

        link.attr("x1", function (d) { return d.sourceIntersection.x; })
            .attr("y1", function (d) { return d.sourceIntersection.y; })
            .attr("x2", function (d) { return d.arrowStart.x; })
            .attr("y2", function (d) { return d.arrowStart.y; });

        node.attr("x", function (d) { return d.innerBounds.x; })
            .attr("y", function (d) { return d.innerBounds.y; })
            .attr("width", function (d) { return d.innerBounds.width(); })
            .attr("height", function (d) { return d.innerBounds.height(); });

        group.attr("x", function (d) { return d.innerBounds.x; })
             .attr("y", function (d) { return d.innerBounds.y; })
             .attr("width", function (d) { return d.innerBounds.width(); })
             .attr("height", function (d) { return d.innerBounds.height(); });

        label.attr("x", function (d) { return d.x; })
             .attr("y", function (d) {
                 var h = this.getBBox().height;
                 return d.y + h / 3.5;
             });
    }).on("end", viewBox);

    function viewBox() {
        var b = cola.vpsc.Rectangle.empty();
        container.selectAll("rect").each(function (d) {
            var bb = this.getBBox();
            b = b.union(new cola.vpsc.Rectangle(bb.x, bb.x + bb.width, bb.y, bb.y + bb.height));
        });
        svg.attr("viewBox", b.x + " " + b.y + " " + (b.width()) + " " + (b.height()));

        d3cola.on("end", function () {});
    }
}