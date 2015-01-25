var xhr = new XMLHttpRequest();
xhr.open("GET", getQueryVariable("example"));
xhr.setRequestHeader("Accept", "application/json");
xhr.onreadystatechange = function(event) {
    if(xhr.readyState === 4)
        if (xhr.status === 200)
            display();
        else
            alert("CDEye not accessible!");
};
xhr.send();

function getQueryVariable(variable) {
   var query = window.location.search.substring(1);
   var vars = query.split("&");
   for (var i = 0; i < vars.length; i++) {
       var pair = vars[i].split("=");
       if(pair[0] == variable)
           return pair[1];
   }
   return(false);
}

function display() {
    var beans = JSON.parse(xhr.responseText);

    var i, j;
    var beanToNodeId = {};
    var nodes = [], links = [], groups = [], constraints = [];

    // First loop on the beans
    for (i = 0; i < beans.bean.length; i++) {
        var bean = beans.bean[i];
        beanToNodeId[bean.id] = i;
        // TODO: the id should be the original id, not the index, though that is required for edge routing
        nodes[i] = {id: i, index: i, name: bean.classSimpleName, width: 200, height: 40};
    }
    // Second loop on the beans graph
    for (i = 0; i < beans.bean.length; i++) {
        bean = beans.bean[i];
        if (bean.injectionPoints) {
            var injectionPoints = bean.injectionPoints.injectionPoint;
            for (j = 0; j < injectionPoints.length; j++)
                links.push({source: beanToNodeId[injectionPoints[j].bean], target: i});
        }
        if (bean.producers) {
            var producers = bean.producers.producer;
            var leaves = [i];
            var offsets = [{node: i, offset: 0}];
            for (j = 0; j < producers.length; j++) {
                var producer = beanToNodeId[producers[j].bean];
                leaves.push(producer);
                // Override the node with the producer member name
                nodes[producer].name = producers[j].name;
                // FIXME: separation constraint isn't enough to have the declaring bean at the top of the group
                constraints.push({type: "separation", axis: "y", left: i, right: producer, gap: 0, equality: false});
                offsets.push({node: producer, offset: 0});
            }
            constraints.push({type: "alignment", axis: "x", offsets: offsets});
            groups.push({leaves: leaves});
        }
    }

    var svg = d3.select("body").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("preserveAspectRatio", "xMidYMid");

    // define arrow markers for graph links
    svg.append("svg:defs")
        .append("svg:marker")
        .attr("id", "end-arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("markerWidth", 3)
        .attr("markerHeight", 3)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5L2,0")
        .attr("stroke-width", "0px")
        .attr("fill", "#555");

    var container = svg.append("g");

    var updateViewBox = true;
    svg.call(d3.behavior.zoom().on("zoom", function() {
        updateViewBox = false;
        container.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }));
    svg.call(d3.behavior.drag().on("dragstart", function() {
        updateViewBox = false;
    }));

    var color = d3.scale.category20();

    var powerGraph = null;
    var d3cola = cola.d3adaptor()
        //.linkDistance(100)
        .avoidOverlaps(true)
        .handleDisconnected(true)
        .convergenceThreshold(0.0001)
        .size([window.innerWidth, window.innerHeight])
        .nodes(nodes)
        .links(links)
        .groups(groups)
        .powerGraphGroups(function (d) {
            powerGraph = d;
            d.groups.forEach(function (v) {
                return v.padding = 10;
            });
        })
        .constraints(constraints)
        .symmetricDiffLinkLengths(20, 8)
        //.jaccardLinkLengths(400, 0.5)
        ;

    var group = container.selectAll(".group")
        .data(powerGraph.groups)
        //.data(d3cola.groups())
        .enter().append("rect")
        .attr("rx", 8).attr("ry", 8)
        .attr("class", "group")
        .style("fill", function (d, i) { return color(i); });

    var link = container.selectAll(".link")
        .data(powerGraph.powerEdges)
        //.data(d3cola.links())
        .enter().append("path")
        .attr("class", "link");

    var margin = 10, pad = 12;

    var node = container.selectAll(".node")
        .data(nodes)
        .enter().append("rect")
        .attr("class", "node")
        .attr("width", function (d) { return d.width + 2 * margin; })
        .attr("height", function (d) { return d.height + 2 * margin; })
        .attr("rx", 5).attr("ry", 5)
        .call(d3cola.drag)
        // override the dragstart listener to stop the viewBox update and the drag event propagation
        .call(d3cola.drag().on("dragstart.d3adaptor", function(d) {
            updateViewBox = false;
            d3.event.sourceEvent.stopPropagation();
            d3cola.dragstart(d);
        }));

    var label = container.selectAll(".label")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .text(function (d) { return d.name; })
        .call(d3cola.drag)
        // override the dragstart listener to stop the viewBox update and the drag event propagation
        .call(d3cola.drag().on("dragstart.d3adaptor", function(d) {
            updateViewBox = false;
            d3.event.sourceEvent.stopPropagation();
            d3cola.dragstart(d);
        }))
        .each(function (d) {
            var b = this.getBBox();
            var extra = 2 * margin + 2 * pad;
            d.width = b.width + extra;
            d.height = b.height + extra;
        });

    var iteration = 0,
        collapse = 0;

    d3cola.on("tick", function (event) {
        if (event.stress < 1)
            return d3cola.stop();
        iteration++;
        update(event);
        if (updateViewBox)
            viewBox();
    }).on("end", function (event) {
        if (event.stress > 0.01 && collapse < 10) {
            collapse++;
            var D = d3cola.descent().D;
            for (var i = 0; i < D.length; i++)
                for (var j = 0; j < D[i].length; j++)
                    D[i][j] *= 0.9;
            d3cola.convergenceThreshold(0.01);
            d3cola.resume();
        } else {
            routeEdges();
            d3cola.on("tick", function (event) {
                if (event.stress < 1)
                    return d3cola.stop();
                update(event);
            });
            d3cola.on("end", routeEdges);
        }
    });

    function routeEdges() {
        d3cola.prepareEdgeRouting(0);
        link.attr("d", function (d) {
            // FIXME: edge routing does not work with power graph groups
            if (!d.source.name || !d.target.name)
                return lineFunction([{ x: d.sourceIntersection.x, y: d.sourceIntersection.y }, { x: d.arrowStart.x, y: d.arrowStart.y }]);
            else
                return lineFunction(d3cola.routeEdge(d));
        });
    }

    var lineFunction = d3.svg.line()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; })
        .interpolate("basis");

    d3cola.start(50, 50, 50);

    function update(event) {
        node.each(function (d) { d.innerBounds = d.bounds.inflate(-margin); })
            .attr("x", function (d) { return d.innerBounds.x; })
            .attr("y", function (d) { return d.innerBounds.y; })
            .attr("width", function (d) { return d.innerBounds.width(); })
            .attr("height", function (d) { return d.innerBounds.height(); });

        group.each(function (d) { d.innerBounds = d.bounds.inflate(-margin); })
            .attr("x", function (d) { return d.innerBounds.x; })
            .attr("y", function (d) { return d.innerBounds.y; })
            .attr("width", function (d) { return d.innerBounds.width(); })
            .attr("height", function (d) { return d.innerBounds.height(); });

        link.attr("d", function (d) {
            cola.vpsc.makeEdgeBetween(d, d.source.innerBounds, d.target.innerBounds, 5);
            return lineFunction([{ x: d.sourceIntersection.x, y: d.sourceIntersection.y }, { x: d.arrowStart.x, y: d.arrowStart.y }]);
        });

        label.attr("x", function (d) { return d.x; })
            .attr("y", function (d) { return d.y + this.getBBox().height / 3.5; });
    }

    function viewBox() {
        var b = cola.vpsc.Rectangle.empty();
        container.selectAll("rect").each(function (d) {
            var bb = this.getBBox();
            b = b.union(new cola.vpsc.Rectangle(bb.x, bb.x + bb.width, bb.y, bb.y + bb.height));
        });
        svg.attr("viewBox", b.x + " " + b.y + " " + (b.width()) + " " + (b.height()));
    }
}