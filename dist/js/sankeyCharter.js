(function () {
  window["Reuters"] = window["Reuters"] || {};
  window["Reuters"]["Graphics"] = window["Reuters"]["Graphics"] || {};
  window["Reuters"]["Graphics"]["tableCharter"] = window["Reuters"]["Graphics"]["tableCharter"] || {};
  window["Reuters"]["Graphics"]["tableCharter"]["Template"] = window["Reuters"]["Graphics"]["tableCharter"]["Template"] || {};

  window["Reuters"]["Graphics"]["tableCharter"]["Template"]["tabletemplate"] = function (t) {
    var __t,
        __p = '',
        __j = Array.prototype.join;
    function print() {
      __p += __j.call(arguments, '');
    }
    __p += '<div class="table-responsive">\n	<table id="dataTable1" cellspacing="1" class="tablesorter table table-condensed">\n	  <thead>\n	    <tr>\n			';
    t.self.headerDisplay.forEach(function (d) {
      ;
      __p += '\n				<th>' + ((__t = d) == null ? '' : __t) + '</th>\n			';
    });
    __p += '\n	    </tr>\n	  </thead>\n	  <tbody>\n			';
    t.data.forEach(function (row) {
      ;
      __p += '\n				<tr role="row">\n					';
      t.self.dataColumnHeaders.forEach(function (header, index) {
        var value = row[header];
        var formater = t.self[t.self.formats[index]] || t.self.text;
        if (index == 0) {
          ;
          __p += '\n							<th>' + ((__t = value) == null ? '' : __t) + '</th>\n						';
        } else {
          ;
          __p += '\n							<td class="';
          if (header == t.self.initialSort) {
            ;
            __p += 'highlight ';
          };
          __p += ' ' + ((__t = header) == null ? '' : __t) + '">' + ((__t = formater(value)) == null ? '' : __t) + '</td>	\n						\n					';
        }
      });
      __p += '\n				</tr>\n			';
    });
    __p += '	  \n	  </tbody>\n	</table>\n</div>';
    return __p;
  };
})();
d3.sankey = function () {
  var sankey = {},
      nodeWidth = 24,
      nodePadding = 8,
      size = [1, 1],
      nodes = [],
      links = [];

  sankey.nodeWidth = function (_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function (_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function (_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function (_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function (_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.layout = function (iterations) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function () {
    computeLinkDepths();
    return sankey;
  };

  sankey.link = function () {
    var curvature = .5;

    function link(d) {
      var x0 = d.source.x + d.source.dx,
          x1 = d.target.x,
          xi = d3.interpolateNumber(x0, x1),
          x2 = xi(curvature),
          x3 = xi(1 - curvature),
          y0 = d.source.y + d.sy + d.dy / 2,
          y1 = d.target.y + d.ty + d.dy / 2;
      return "M" + x0 + "," + y0 + "C" + x2 + "," + y0 + " " + x3 + "," + y1 + " " + x1 + "," + y1;
    }

    link.curvature = function (_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    nodes.forEach(function (node) {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(function (link) {
      var source = link.source,
          target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    nodes.forEach(function (node) {
      node.value = Math.max(d3.sum(node.sourceLinks, value), d3.sum(node.targetLinks, value));
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {
    var remainingNodes = nodes,
        nextNodes,
        x = 0;

    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(function (node) {
        node.x = x;
        node.dx = nodeWidth;
        node.sourceLinks.forEach(function (link) {
          if (nextNodes.indexOf(link.target) < 0) {
            nextNodes.push(link.target);
          }
        });
      });
      remainingNodes = nextNodes;
      ++x;
    }

    //
    moveSinksRight(x);
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function moveSourcesRight() {
    nodes.forEach(function (node) {
      if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, function (d) {
          return d.target.x;
        }) - 1;
      }
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(function (node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx) {
    nodes.forEach(function (node) {
      node.x *= kx;
    });
  }

  function computeNodeDepths(iterations) {
    var nodesByBreadth = d3.nest().key(function (d) {
      return d.x;
    }).sortKeys(d3.ascending).entries(nodes).map(function (d) {
      return d.values;
    });

    //
    initializeNodeDepth();
    resolveCollisions();
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeDepth() {
      var ky = d3.min(nodesByBreadth, function (nodes) {
        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
      });

      nodesByBreadth.forEach(function (nodes) {
        nodes.forEach(function (node, i) {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(function (link) {
        link.dy = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha) {
      nodesByBreadth.forEach(function (nodes, breadth) {
        nodes.forEach(function (node) {
          if (node.targetLinks.length) {
            var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedSource(link) {
        return center(link.source) * link.value;
      }
    }

    function relaxRightToLeft(alpha) {
      nodesByBreadth.slice().reverse().forEach(function (nodes) {
        nodes.forEach(function (node) {
          if (node.sourceLinks.length) {
            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target) * link.value;
      }
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(function (nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }

  function computeLinkDepths() {
    nodes.forEach(function (node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(function (node) {
      var sy = 0,
          ty = 0;
      node.sourceLinks.forEach(function (link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function (link) {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};
//# sourceMappingURL=sankey.js.map

//the view that constructs a linechart
sankeygen = Backbone.View.extend({
	data: undefined,
	dataURL: undefined,
	template: undefined,
	colorSource: undefined,
	countryDomain: undefined,
	colors: [red1, blue1, lime1, orange1, green1, blue4],
	margin: { left: 100, right: 100, top: 20, bottom: 80 },
	leftLabel: "Origin",
	rightLabel: "Destination",
	linkTitles: function linkTitles(d) {
		var self = this;
		return '<p class="tooltip-title">' + d.source.name + " to " + d.target.name.replace(/1/g, '') + '</p><p class="tooltip-display">' + self.format(d.value) + '</p>';
	},
	nodeTitles: function nodeTitles(d) {
		var self = this;
		return '<p class="tooltip-title">' + d.name + "</p><p class='tooltip-display'>" + self.format(d.value) + '</p>';
	},
	textLabels: function textLabels(d) {
		var self = this;
		return d.name.replace(/1/g, '');
	},
	initialize: function initialize(opts) {

		this.options = opts;
		var self = this;

		// if we are passing in options, use them instead of the defualts.
		_.each(opts, function (item, key) {
			self[key] = item;
		});

		//Test which way data is presented and load appropriate way
		if (this.dataURL.indexOf("csv") == -1 && !_.isObject(this.dataURL)) {
			d3.json(self.dataURL, function (data) {
				self.parseData(data);
			});
		}
		if (this.dataURL.indexOf("csv") > -1) {
			d3.csv(self.dataURL, function (data) {
				self.parseData(data);
			});
		}
		if (_.isObject(this.dataURL)) {
			setTimeout(function () {
				self.parseData(self.dataURL);
			}, 100);
		}

		//end of initialize		
	},
	parseData: function parseData(data) {
		var self = this;
		self.data = data;

		self.fill = d3.scale.ordinal()
		// .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ])
		.range(self.colors);

		if (self.countryDomain) {
			self.fill.domain(self.countryDomain);
		}

		self.formatNumber = d3.format(",.0f"), // zero decimal places
		self.format = function (d) {
			return self.formatNumber(d) + " ";
		};

		//set up graph in same style as original example but empty
		self.graph = { "nodes": [], "links": [] };

		self.data.forEach(function (d) {
			self.graph.nodes.push({ "name": d.origin });
			self.graph.nodes.push({ "name": d.target });
			self.graph.links.push({ "source": d.origin,
				"target": d.target,
				"value": +d.value
			});
		});

		// return only the distinct / unique nodes
		self.graph.nodes = d3.keys(d3.nest().key(function (d) {
			return d.name;
		}).map(self.graph.nodes));

		// loop through each link replacing the text with its index from node
		self.graph.links.forEach(function (d, i) {
			self.graph.links[i].source = self.graph.nodes.indexOf(self.graph.links[i].source);
			self.graph.links[i].target = self.graph.nodes.indexOf(self.graph.links[i].target);
		});

		//now loop through each nodes to make nodes an array of objects
		// rather than an array of strings
		self.graph.nodes.forEach(function (d, i) {
			self.graph.nodes[i] = { "name": d };
		});

		self.baseRender();
	},
	baseRender: function baseRender() {

		var self = this;
		self.targetDiv = $(self.el).attr("id");

		self.width = $(self.el).width();
		self.height = self.width * 2 / 3;

		self.leftLabel = d3.select(self.el).style("position", "relative").append("p").attr("class", "sankey-label left").style("width", self.margin.left - 8 + "px").html(self.leftLabel);

		self.leftLabel = d3.select(self.el).style("position", "relative").append("p").attr("class", "sankey-label right").style("width", self.margin.right - 8 + "px").html(self.rightLabel);

		self.svg = d3.select(self.el).append("svg").attr("width", self.width).attr("height", self.height).append("g").attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

		self.sankey = d3.sankey().nodeWidth(10).nodePadding(10).size([self.width - self.margin.left - self.margin.right, self.height - self.margin.top - self.margin.bottom]).nodes(self.graph.nodes).links(self.graph.links).layout(0);

		self.path = self.sankey.link();

		// add in the links
		self.link = self.svg.append("g").selectAll(".link").data(self.graph.links).enter().append("path").attr("class", function (d) {
			//color links from exporting country
			return "link alt-link " + d.source.name + "-link";
			//color links from importing country
			// return "link " + d.target.name.replace(/1/g, '') + "-link"
		}).attr("d", self.path).sort(function (a, b) {
			return a.dy + b.dy;
		}).style("stroke-width", function (d) {
			return Math.max(2, d.dy);
		}).style("stroke", function (d) {
			if (self.colorSource) {
				return self.fill(d.source.name);
			}
			return self.fill(d.target.name);
		});

		// add the link titles
		self.link.attr("title", function (d) {
			return self.linkTitles(d);
		});

		// add in the nodes
		self.node = self.svg.append("g").selectAll(".node").data(self.graph.nodes).enter().append("g").attr("class", "node").attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		}).call(d3.behavior.drag().origin(function (d) {
			return d;
		}).on("dragstart", function () {
			this.parentNode.appendChild(this);
		}).on("drag", dragmove));

		// add the rectangles for the nodes
		self.node.append("rect").attr("height", function (d) {
			if (d.dy < 2) {
				return 2;
			}return d.dy;
		}).attr("width", self.sankey.nodeWidth()).attr("class", function (d, i) {
			return d.name + "-node";
		}).style("fill", function (d) {
			if (self.colorSource) {
				if (d.sourceLinks[0]) {
					return self.fill(d.name);
				}
				return black;
			}

			if (d.targetLinks[0]) {
				return self.fill(d.name);
			}
			return black;
		}).attr("title", function (d) {
			return self.nodeTitles(d);
		}).on("mouseover", function (d) {
			var targets = [];
			d.targetLinks.forEach(function (d) {
				targets.push(d.target.name);
			});
			var sources = [];
			d.sourceLinks.forEach(function (d) {
				sources.push(d.source.name);
			});
			self.link.style("stroke-opacity", function (d) {
				if (sources.indexOf(d.source.name) > -1) {
					return .8;
				}
				if (targets.indexOf(d.target.name) > -1) {
					return .8;
				}
			});
		}).on("mouseout", function (d) {
			self.link.style("stroke-opacity", .2);
		});

		// add in the title for the nodes
		self.node.append("text").attr("x", 20).attr("y", function (d) {
			if (d.name == "Malta") {
				return d.dy / 2 + 5;
			} else {
				return d.dy / 2;
			}
		}).attr("dy", ".35em").attr("text-anchor", "start").attr("transform", null).attr("class", "label-axis").text(function (d) {
			return self.textLabels(d);
		}).filter(function (d) {
			return d.x < self.width / 2;
		}).attr("x", 0 - self.sankey.nodeWidth()).attr("text-anchor", "end");

		// the function for moving the nodes
		function dragmove(d) {
			d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(self.height - d.dy, d3.event.y))) + ")");
			self.sankey.relayout();
			self.link.attr("d", self.path);
		}

		self.$('rect').tooltip({
			html: true,
			placement: "bottom"
		});
		self.$('.link').tooltip({
			html: true,
			placement: "bottom"
		});

		$(window).on("resize", _.debounce(function (event) {
			self.newWidth = self.$el.width();
			if (self.newWidth == self.width || self.newWidth <= 0) {
				return;
			}
			self.width = self.newWidth;

			self.resize();
		}, 100));
	},
	resize: function resize() {
		var self = this;
		self.height = self.width * 2 / 3;

		d3.select("#" + self.targetDiv + ' svg').transition().attr("width", self.width).attr("height", self.height);

		self.svg.attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

		self.sankey.nodeWidth(10).nodePadding(10).size([self.width - self.margin.left - self.margin.right, self.height - self.margin.top - self.margin.bottom]).nodes(self.graph.nodes).links(self.graph.links).layout(0);

		self.path = self.sankey.link();

		d3.selectAll("#" + self.targetDiv + ' .link').transition().attr("d", self.path).style("stroke-width", function (d) {
			return Math.max(2, d.dy);
		});

		d3.selectAll("#" + self.targetDiv + ' rect').transition().attr("height", function (d) {
			if (d.dy < 2) {
				return 2;
			} else {
				return d.dy;
			}
		}).attr("width", self.sankey.nodeWidth());

		// add in the nodes
		d3.selectAll("#" + self.targetDiv + ' .node').data(self.graph.nodes).transition().attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		}).attr("height", function (d) {
			return d.dy;
		}).attr("width", self.sankey.nodeWidth());

		d3.selectAll("#" + self.targetDiv + " text").transition().attr("y", function (d) {
			if (d.name == "Malta") {
				return d.dy / 2 + 5;
			} else {
				return d.dy / 2;
			}
		}).attr("text-anchor", "start").attr("transform", null).text(function (d) {
			return self.textLabels(d);
		}).filter(function (d) {
			return d.x < self.width / 2;
		}).attr("x", 0 - self.sankey.nodeWidth()).attr("text-anchor", "end");
	}

	//end of view
});
//# sourceMappingURL=sankeygen.js.map
