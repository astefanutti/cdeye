var request = { beans: "cdeye/beans" };
if (getQueryVariable("modules") === "true")
    request.modules = "cdeye/modules";

cdEyeRequest(request, display);

function cdEyeRequest(request, callback) {
    var response = {};
    var count = 0;
    var total = Object.keys(request).length;
    for (var url in request) {
        var xhr = new XMLHttpRequest();
        xhr.url = url;
        xhr.open("GET", request[url]);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    response[this.url] = JSON.parse(this.responseText);
                    if (++count == total)
                        callback(response);
                } else {
                    alert("CDEye not accessible!");
                }
            }
        };
        xhr.send();
    }
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable)
            return pair[1];
    }
    return null;
}

function display(cdEye) {
    var beans = cdEye.beans;
    var modules = cdEye.modules;

    var i, j;
    var beanToNodeId = {}, beanToGroupId = {};
    var nodes = [], links = [], groups = [], constraints = [];

    if (modules) {
        // Loop over the modules
        for (i = 0; i < modules.module.length; i++) {
            var module = modules.module[i];
            groups.push({leaves: [], groups: [], stiffness: 0.001, name: module.name});
            for (j = 0; j < module.beans.bean.length; j++)
                beanToGroupId[module.beans.bean[j]] = groups.length - 1;
        }
    }

    // Loop over the beans
    for (i = 0; i < beans.bean.length; i++) {
        var bean = beans.bean[i];
        beanToNodeId[bean.id] = i;
        // TODO: the id should be the original id, not the index, though that is required for edge routing (test if that is still required for metro line edge router)
        nodes[i] = {id: i, index: i, name: bean.classSimpleName, width: 150, height: 50};
        if (modules && bean.id in beanToGroupId)
            groups[beanToGroupId[bean.id]].leaves.push(i);
    }

    // Loop over the beans graph
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
            var parent = (modules && bean.id in beanToGroupId) ? groups[beanToGroupId[bean.id]] : null;
            if (parent)
                parent.leaves.splice(parent.leaves.indexOf(i), 1);
            var offsets = [{node: i, offset: 0}];
            for (j = 0; j < producers.length; j++) {
                var producer = beanToNodeId[producers[j].bean];
                leaves.push(producer);
                // Override the parent group is any
                if (parent)
                    parent.leaves.splice(parent.leaves.indexOf(producer), 1);
                // Override the node with the producer member name
                nodes[producer].name = producers[j].name;
                // FIXME: separation constraint isn't enough to have the declaring bean at the top of the group
                constraints.push({type: "separation", axis: "y", left: i, right: producer, gap: 0, equality: false});
                offsets.push({node: producer, offset: 0});
            }
            constraints.push({type: "alignment", axis: "x", offsets: offsets});
            groups.push({leaves: leaves, stiffness: 1.0});
            if (parent)
                parent.groups.push(groups.length - 1);
        }
    }

    var debug = d3.select("body")
        .append("div")
        .attr("class", "debug");

    var svg = d3.select("body").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("preserveAspectRatio", "xMidYMid");

    // Define arrow markers for graph links
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
        container.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    }));
    svg.call(d3.behavior.drag().on("dragstart", function() {
        updateViewBox = false;
    }));

    var color = d3.scale.category20();
    var nodeMargin = 10, nodePadding = 10;
    var groupMargin = 10, groupPadding = 10;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // compute power graph
    var powerGraph = null;
    cola.d3adaptor()
        .avoidOverlaps(false)
        .nodes(nodes)
        .links(links)
        .groups(groups)
        .powerGraphGroups(function (d) {
            powerGraph = d;
            powerGraph.groups.forEach(function (v) {
                v.padding = groupPadding;
            });
        });
    // construct a flat graph with dummy nodes for the groups and edges connecting group dummy nodes to their children
    // power edges attached to groups are replaced with edges connected to the corresponding group dummy node
    var n = nodes.length;
    var edges = [];
    var vs = nodes.slice(0);
    powerGraph.groups.forEach(function (g) {
        var sourceInd = g.index = g.id + n;
        vs.push(g);
        if (typeof g.leaves !== 'undefined')
            g.leaves.forEach(function (v) { return edges.push({ source: sourceInd, target: v.index }); });
        if (typeof g.groups !== 'undefined')
            g.groups.forEach(function (gg) { return edges.push({ source: sourceInd, target: gg.id + n }); });
    });
    powerGraph.powerEdges.forEach(function (e) {
        edges.push({ source: e.source.index, target: e.target.index });
    });
    // layout the flat graph with dummy nodes and edges
    cola.d3adaptor()
        .size([window.innerWidth, window.innerHeight])
        .nodes(vs)
        .links(edges)
        .avoidOverlaps(false)
        //.symmetricDiffLinkLengths(5)
        .symmetricDiffLinkLengths(30, 4)
        .constraints(constraints)
        .start(50, 100);
    // final layout taking node positions from above as starting positions
    // subject to group containment constraints
    // FIXME: find a proper way to deal with multiple power graph passes
    nodes.forEach(function(n) { delete n.parent; delete n.bounds; });
    var d3cola = cola.d3adaptor()
        .size([window.innerWidth, window.innerHeight])
        .avoidOverlaps(true)
        .nodes(nodes)
        .links(links)
        .groups(groups)
        //.groupCompactness(1e-4)
        //.symmetricDiffLinkLengths(3)
        .symmetricDiffLinkLengths(20, 4)
        //.jaccardLinkLengths(400, 0.5)
        .powerGraphGroups(function (d) {
            powerGraph = d;
            powerGraph.groups.forEach(function (v) {
                v.padding = groupPadding;
                if (typeof v.stiffness === "undefined")
                    v.stiffness = 1.0;
            });
        })
        .constraints(constraints);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var group = container.selectAll(".group")
        .data(powerGraph.groups)
        //.data(d3cola.groups())
        .enter().append("rect")
        .attr("rx", 8).attr("ry", 8)
        .attr("class", "group")
        .style("fill", function (d, i) { return color(i); })
        .style("stroke", function (d, i) { return color(i); });

    var link = container.selectAll(".link")
        .data(powerGraph.powerEdges)
        //.data(d3cola.links())
        .enter().append("g");

    var node = container.selectAll(".node")
        .data(nodes)
        .enter().append("rect")
        .attr("class", "node")
        .attr("rx", 5).attr("ry", 5)
        .call(d3cola.drag)
        // override the dragstart listener to stop the viewBox update and the drag event propagation
        .call(d3cola.drag().on("dragstart.d3adaptor", function(d) {
            updateViewBox = false;
            d3.event.sourceEvent.stopPropagation();
            cola.Layout.dragStart(d);
        }));

    var label = container.selectAll(".label")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .text(function (d) { return d.name; })
        .each(function (d) {
            var bb = this.getBBox();
            var extra = 2 * (nodeMargin + nodePadding);
            var sw = (d.width - extra) / bb.width;
            var sh = (d.height - extra) / bb.height;
            d.scale = (sw < sh ? sw : sh);
        })
        .call(d3cola.drag)
        // override the dragstart listener to stop the viewBox update and the drag event propagation
        .call(d3cola.drag().on("dragstart.d3adaptor", function(d) {
            updateViewBox = false;
            d3.event.sourceEvent.stopPropagation();
            cola.Layout.dragStart(d);
        }));

    var iteration = 0, collapse = 0;

    d3cola.on("tick", function (event) {
        iteration++;
        update(event);
        if (updateViewBox)
            viewBox();
    }).on("end", function (event) {
        // FIXME: find a proper way to deal with multiple power graph passes
        nodes.forEach(function(n) { delete n.parent; delete n.bounds; });
        // TODO: proper transition to gridification
        d3cola.start(0, 0, 1, 1);
        d3cola.on("tick", function (event) {
            update(event);
        });
        d3cola.on("end", routeEdges);
    });

    function getId(v, n) {
        return (typeof v.index === 'number' ? v.index : v.id + n) + 1;
    }

    function routeEdges() {
        //d3cola.prepareEdgeRouting(0);
        //link.attr("d", function (d) {
        // FIXME: edge routing does not work with power graph groups
        //    if (!d.source.name || !d.target.name)
        //        return lineFunction([{ x: d.sourceIntersection.x, y: d.sourceIntersection.y }, { x: d.arrowStart.x, y: d.arrowStart.y }]);
        //    else
        //        return lineFunction(d3cola.routeEdge(d));
        //});

        //length.each(function (d) { d.l = d.getTotalLength(); d.p = d.getPointAtLength(d.l / 2); })
        //    .attr("x", function (d) { return d.p.x; })
        //    .attr("y", function (d) { return d.p.y; })
        //    .text(function (d) { return Math.floor(d.l) + "(" + Math.floor(d.computedLength) + ")"} );
        var n = nodes.length, _id = function (v) {
            return getId(v, n) - 1;
        }, g = {
            nodes: nodes.map(function (d) {
                return {
                    id: _id(d),
                    name: d.name,
                    //bounds: new cola.vpsc.Rectangle(d.x, d.x + d.width, d.y, d.y + d.height)
                    bounds: d.innerBounds
                };
            }).concat(powerGraph.groups.map(function (d) {
                return {
                    id: _id(d),
                    //innerBounds: d.innerBounds,
                    children: (typeof d.groups !== 'undefined' ? d.groups.map(function (c) {
                        return n + c.id;
                    }) : []).concat(typeof d.leaves !== 'undefined' ? d.leaves.map(function (c) {
                            return c.index;
                        }) : [])
                };
            })),
            edges: powerGraph.powerEdges.map(function (e) {
                return {
                    source: _id(e.source),
                    target: _id(e.target),
                    type: e.type
                };
            })
        };
        var gridRouter = new cola.GridRouter(g.nodes, {
            getChildren: function (v) {
                return v.children;
            },
            getBounds: function (v) {
                return v.bounds;
            }
        }, groupPadding);

        var routes = gridRouter.routeEdges(g.edges, 6, function (e) { return e.source; }, function (e) { return e.target; });

        link.selectAll("path").remove();
        link.each( function (d, i) {
            var cornerRadius = 8, arrowWidth = 4, lineWidth = 2, arrowHeight = 7;
            var p = cola.GridRouter.getRoutePath(routes[i], cornerRadius, arrowWidth, arrowHeight);
            var l = d3.select(this);
            l.append('path')
                .attr('d', p.arrowpath + ' Z')
                .attr('stroke', '#888888')
                .attr('stroke-width', 1);
            l.append('path')
                .attr('d', p.arrowpath)
                .attr('stroke', 'none')
                .attr('fill', '#aaaaaa');
            l.append('path')
                .attr('d', p.routepath)
                .attr('fill', 'none')
                .attr('stroke', '#888888')
                .attr('stroke-width', lineWidth + 1);
            l.append('path')
                .attr('d', p.routepath)
                .attr('fill', 'none')
                .attr('stroke', '#aaaaaa')
                .attr('stroke-width', lineWidth);
        });
    }

    var lineFunction = d3.svg.line()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; })
        .interpolate("basis");

    d3cola.start(50, 50, 50);

    function update(event) {
        debug.html("iteration:" + iteration + "<br/>" +
            "collapse:" + collapse + "<br/>" +
            "alpha:" + d3.format(".2r")(event.alpha) + "<br/>"
        );

        node.each(function (d) { d.innerBounds = d.bounds.inflate(-nodeMargin); })
            .attr("x", function (d) { return d.innerBounds.x; })
            .attr("y", function (d) { return d.innerBounds.y; })
            .attr("width", function (d) { return d.innerBounds.width(); })
            .attr("height", function (d) { return d.innerBounds.height(); });

        group.each(function (d) { d.innerBounds = d.bounds.inflate(-groupMargin); })
            .attr("x", function (d) { return d.innerBounds.x; })
            .attr("y", function (d) { return d.innerBounds.y; })
            .attr("width", function (d) { return d.innerBounds.width(); })
            .attr("height", function (d) { return d.innerBounds.height(); });

        link.selectAll("path").remove();
        link.append("path")
            .attr("class", "link")
            .attr("d", function (d) {
                cola.vpsc.makeEdgeBetween(d, d.source.innerBounds, d.target.innerBounds, 5);
                return lineFunction([{ x: d.sourceIntersection.x, y: d.sourceIntersection.y }, { x: d.arrowStart.x, y: d.arrowStart.y }]);
            }
        );

        label.attr("transform", function(d) {
            return "translate(" + d.x + "," + (d.y + (this.getBBox().height * d.scale) / 3) + ") scale(" + d.scale + ")";
        });

        //length.each(function (d) { d.l = d.getTotalLength(); d.p = d.getPointAtLength(d.l / 2); })
        //    .attr("x", function (d) { return d.p.x; })
        //    .attr("y", function (d) { return d.p.y; })
        //    .text(function (d) { return Math.floor(d.l) + "(" + Math.floor(d.computedLength) + ")"} );
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