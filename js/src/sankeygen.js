		//the view that constructs a linechart
sankeygen = Backbone.View.extend({
	data: undefined,
	dataURL:undefined,
	template: undefined,
	colorSource:undefined,
	countryDomain:undefined,
	colors: [red1,blue1,lime1,orange1,green1,blue4],
	margin: {left:100, right:100, top:20, bottom:80},
	leftLabel:"Origin",
	rightLabel:"Destination",
	linkTitles: function(d) {
		var self = this;
		return '<p class="tooltip-title">' + d.source.name + " to " +  d.target.name.replace(/1/g, '') + '</p><p class="tooltip-display">' + self.format(d.value) + '</p>'
	},
	nodeTitles: function(d) { 
		var self = this;
		return '<p class="tooltip-title">' + d.name + "</p><p class='tooltip-display'>" + self.format(d.value) + '</p>'; 
	},
	textLabels:function(d) { 
		var self = this;
		return d.name.replace(/1/g, ''); 
	},
	initialize: function(opts){

		this.options = opts; 
        var self = this;
        		
		// if we are passing in options, use them instead of the defualts.
		_.each(opts, function(item, key){
			self[key] = item;
		});	

		//Test which way data is presented and load appropriate way
		if (this.dataURL.indexOf("csv") == -1 && !_.isObject(this.dataURL)){
			d3.json(self.dataURL, function(data){
				self.parseData (data);
			});
		} 
		if (this.dataURL.indexOf("csv") > -1){
			d3.csv(self.dataURL, function(data){
				self.parseData (data);
			});
		}
		if (_.isObject(this.dataURL)){
			setTimeout(function(){
				self.parseData (self.dataURL);											
			}, 100);
		}	

	
	//end of initialize		
	},
	parseData: function(data){
		var self = this;
		self.data = data

	
	self.fill = d3.scale.ordinal()
	    // .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ])
	    .range(self.colors);
	    
	if (self.countryDomain){
		self.fill.domain(self.countryDomain)
	}
	
	self.formatNumber = d3.format(",.0f"),    // zero decimal places
    	self.format = function(d) { return self.formatNumber(d) + " " };


		//set up graph in same style as original example but empty
	self.graph = {"nodes" : [], "links" : []};

	self.data.forEach(function (d) {
		self.graph.nodes.push({ "name": d.origin});
		self.graph.nodes.push({ "name": d.target });
		self.graph.links.push({ "source": d.origin,
		     "target": d.target,
		     "value": +d.value,
		 });

	});


	// return only the distinct / unique nodes
	self.graph.nodes = d3.keys(d3.nest()
		.key(function (d) { return d.name; })
		.map(self.graph.nodes));

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
	baseRender: function() { 


	var self = this;
		self.targetDiv = $(self.el).attr("id");
		

	self.width = $(self.el).width() 
	self.height = self.width* 2 / 3
	
	self.leftLabel = d3.select(self.el)
		.style("position","relative")
		.append("p")
		.attr("class", "sankey-label left")
		.style("width", self.margin.left - 8 +"px")
		.html(self.leftLabel)

	self.leftLabel = d3.select(self.el)
		.style("position","relative")
		.append("p")
		.attr("class", "sankey-label right")
		.style("width", self.margin.right - 8 +"px")
		.html(self.rightLabel)
	
	self.svg = d3.select(self.el).append("svg")
	    .attr("width", self.width)
	    .attr("height", self.height)
	  	.append("g")
	    .attr("transform", 
	          "translate("+self.margin.left+","+self.margin.top+")");

	self.sankey = d3.sankey()
		.nodeWidth(10)
		.nodePadding(10)
		.size([self.width - self.margin.left-self.margin.right, self.height - self.margin.top - self.margin.bottom])
		.nodes(self.graph.nodes)
		.links(self.graph.links)
		.layout(0);


	self.path = self.sankey.link();

	// add in the links
	self.link = self.svg.append("g").selectAll(".link")
		.data(self.graph.links)
		.enter().append("path")
		.attr("class", function (d) {
			//color links from exporting country
			return "link alt-link " + d.source.name + "-link"
			//color links from importing country
			// return "link " + d.target.name.replace(/1/g, '') + "-link"
		})
		.attr("d", self.path)
		.sort(function(a, b) { return a.dy + b.dy; })
		.style("stroke-width", function(d) { 
			return Math.max(2, d.dy); 
		})

		 .style("stroke", function (d){ 
		 	if (self.colorSource){		 		
		 		return self.fill(d.source.name)
		 	}
		 	return  self.fill(d.target.name)
		 })



	// add the link titles
	self.link
	    .attr("title",function(d){
			return self.linkTitles(d)
        })


	// add in the nodes
	self.node = self.svg.append("g").selectAll(".node")
		.data(self.graph.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("transform", function(d) { 
		return "translate(" + d.x + "," + d.y + ")"; })
		.call(d3.behavior.drag()
		.origin(function(d) { return d; })
		.on("dragstart", function() { 
		this.parentNode.appendChild(this); })
		.on("drag", dragmove));

	// add the rectangles for the nodes
	self.node.append("rect")
		.attr("height", function(d) { if (d.dy <2){ return 2}return d.dy; })
		.attr("width", self.sankey.nodeWidth())
		.attr("class", function (d,i) {
			return d.name + "-node"
		})
		.style("fill", function(d){
			if (self.colorSource){
				if (d.sourceLinks[0]){
					return self.fill(d.name)
				}
				return black	
			}

			if (d.targetLinks[0]){
				return self.fill(d.name)
			}
			return black
		})
		.attr("title",function(d) { 
			return self.nodeTitles(d);
		})
		
		 .on("mouseover", function(d){
			 var targets = []
			 d.targetLinks.forEach(function(d){
				 targets.push(d.target.name)
			 })
			 var sources = []
			 d.sourceLinks.forEach(function(d){
				 sources.push(d.source.name)
			 })
			 self.link
			 	.style("stroke-opacity", function(d){
				 	if (sources.indexOf(d.source.name) > -1) {return .8}
				 	if (targets.indexOf(d.target.name) > -1) {return .8}
			 	})
			 
		 })
		 .on("mouseout", function(d){
			 self.link.style("stroke-opacity", .2)
		 })

	// add in the title for the nodes
	self.node.append("text")
		.attr("x", 20)
		.attr("y", function(d) {
			if (d.name == "Malta") {return (d.dy/2)+5  } else { return d.dy / 2; }})		
		.attr("dy", ".35em")
		.attr("text-anchor", "start")
		.attr("transform", null)
		.attr("class", "label-axis")
		.text(function(d) {
			return self.textLabels(d);
			
		})
		.filter(function(d) { return d.x < self.width / 2; })
		.attr("x", 0 - self.sankey.nodeWidth())
		.attr("text-anchor", "end");


	// the function for moving the nodes
	function dragmove(d) {
		d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(self.height - d.dy, d3.event.y))) + ")");
		self.sankey.relayout();
		self.link.attr("d", self.path);
	}

    	self.$('rect').tooltip({
    	        html: true, 
    	        placement:"bottom" 
    	    });
    	self.$('.link').tooltip({
    	        html: true, 
    	        placement:"bottom" 
    	    });

		$(window).on("resize", _.debounce(function(event) {
			self.newWidth = self.$el.width()
			if (self.newWidth == self.width || self.newWidth <= 0){
				return
			}
			self.width = self.newWidth;

			self.resize();
		},100));



	},
	resize: function(){
			var self = this;
			self.height = self.width *2 / 3;		
			
			d3.select("#"+self.targetDiv+' svg') 
				.transition()
				.attr("width", self.width)
				.attr("height", self.height)

				self.svg
				.attr("transform", 
	          "translate("+self.margin.left+","+self.margin.top+")");
		
			self.sankey 
				.nodeWidth(10)
				.nodePadding(10)
				.size([self.width - self.margin.left-self.margin.right, self.height - self.margin.top - self.margin.bottom])
				.nodes(self.graph.nodes)
				.links(self.graph.links)
				.layout(0);
		
			self.path = self.sankey.link();
		
		
			d3.selectAll("#"+self.targetDiv+' .link')
				.transition()
				.attr("d", self.path)
				.style("stroke-width", function(d) { 
					return Math.max(2, d.dy);	
				})
				
		
		
			d3.selectAll("#"+self.targetDiv+' rect')
				.transition()
				.attr("height", function(d) { if (d.dy < 2){ return 2 } else {return d.dy; }})
				.attr("width", self.sankey.nodeWidth())

		
			// add in the nodes
			d3.selectAll("#"+self.targetDiv+' .node')
				.data(self.graph.nodes)
				.transition()
				.attr("transform", function(d) { 
					return "translate(" + d.x + "," + d.y + ")"; })
				.attr("height", function(d) { return d.dy; })
				.attr("width", self.sankey.nodeWidth())

		
			d3.selectAll("#"+self.targetDiv+" text")
				.transition()
				.attr("y", function(d) {
					if (d.name == "Malta") {return (d.dy/2)+5  } else { return d.dy / 2; }})		
				.attr("text-anchor", "start")
				.attr("transform", null)
				.text(function(d) {
					return self.textLabels(d);
					
				})
				.filter(function(d) { return d.x < self.width / 2; })
				.attr("x", 0 - self.sankey.nodeWidth())
				.attr("text-anchor", "end");

		
	}
	

//end of view
});








