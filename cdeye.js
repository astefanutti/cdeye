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

    var nodes = [];
    var links = [];
    var producerGroups = [];

    var i, j;

    for (i = 0; i < beans.bean.length; i++) {
        var bean = beans.bean[i];
        if (!nodes[i])
            nodes[i] = {id: i, name: bean.classSimpleName, width: 200, height: 40};
        if (bean.injectionPoints) {
            var injectionPoints = bean.injectionPoints.injectionPoint;
            for (j = 0; j < injectionPoints.length; j++)
                links.push({source: parseInt(injectionPoints[j].bean), target: i});
        }
        if (bean.producers) {
            var producers = bean.producers.producer;
            // TODO: find a way to have the declaring bean at the top of the group
            var producerGroup = [i];
            for (j = 0; j < producers.length; j++) {
                var producer = parseInt(producers[j].bean);
                producerGroup.push(producer);
                // Override the node with the producer member name
                nodes[producer] = {id: producer, name: producers[j].name, width: 200, height: 40};
            }
            producerGroups.push(producerGroup);
        }
    }

    var d3cola = cola.d3adaptor()
        .linkDistance(100)
        .avoidOverlaps(true)
        .handleDisconnected(true)
        .convergenceThreshold(0.01)
        .symmetricDiffLinkLengths(10, 0.5)
        .jaccardLinkLengths(100)
        .size([window.innerWidth, window.innerHeight]);

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
    d3cola.nodes(nodes)
        .links(links)
        //.groups(groups)
        .powerGraphGroups(function (d) {
            powerGraph = d;
            d.groups.forEach(function (v) {
                return v.padding = 10;
            });
        });

    function addGroup(id, nodeIds) {
        var idx;
        var parents = {};
        var leaves = [], offsets = [], groups = [];
        for (var k = 0; k < nodeIds.length; k++) {
            var node = nodes[nodeIds[k]];
            if (node.parent) {
                // TODO: handle second level group nesting
                parents[node.parent.id] = node.parent;
            } else {
                leaves.push(node);
                idx = d3cola.rootGroup().leaves.indexOf(node);
                d3cola.rootGroup().leaves.splice(idx, 1);
            }
            offsets.push({node: nodeIds[k], offset: 0});
        }

        var grp = {id: id, padding: 10, leaves: leaves, groups: groups};
        grp.leaves.forEach(function (v) {
            if (!v.parent)
                v.parent = grp;
        });

        for (var groupId in parents) {
            groups.push(parents[groupId]);
            idx = d3cola.rootGroup().groups.indexOf(parents[groupId]);
            d3cola.rootGroup().groups.splice(idx, 1);
        }

        d3cola.groups().push(grp);
        d3cola.rootGroup().groups.push(grp);

        d3cola.constraints().push({type: "alignment", axis: "x", offsets: offsets});
    }

    // Add groups for the producers and their declaring bean
    var rid = d3cola.rootGroup().groups.length - 1;
    for (i = 0; i < producerGroups.length; i++)
        addGroup(rid, producerGroups[i]);

    var group = container.selectAll(".group")
        .data(d3cola.groups())
        //.data(powerGraph.groups)
        .enter().append("rect")
        .attr("rx", 8).attr("ry", 8)
        .attr("class", "group")
        .style("fill", function (d, i) { return color(i); });

    var link = container.selectAll(".link")
        .data(powerGraph.powerEdges)
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

    d3cola.on("tick", function () {
        update();
        if (updateViewBox)
            viewBox();
    }).on("end", function () {
        routeEdges();
        d3cola.on("tick", update);
        d3cola.on("end", routeEdges);
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

    d3cola.start();

    function update() {
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