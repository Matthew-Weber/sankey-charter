			//data wants the column headers to be origin - target - value
			var sankey1 = new sankeygen({
				el: "#reutersGraphicX",
				dataURL:"data/data.csv",
				//changing to true will color the links by source instead of target
				colorSource:false,
				colors: ["#8EC541","#09A64A","#1F8FCD","#0E519E","#653190","#952977","#BF2360","#EB2033","#F16725"],
				//if you define the domain, the colors will match up in the same order as the color array
				//countryDomain:["Kosovo", "Syria", "Afghanistan","Albania","Serbia","Iraq","Pakistan","Nigeria","Eritrea","Others"],
// 				margin:{left:80, right:65, top:5, bottom:0},	
				//define these functions if you want to control the tooltip text, or the labels

				leftLabel:"<br>Project",
				rightLabel:"Funding Source",
            	linkTitles: function(d) {
            		var self = this;
            		return '<p class="tooltip-title">' + d.source.name + " to " +  d.target.name.replace(/1/g, '') + '</p><p class="tooltip-display">' + self.format(d.value) + '</p>'
            	},
            	nodeTitles: function(d) { 
            		var self = this;
            		return '<p class="tooltip-title">' + d.name + "</p><p class='tooltip-display'>" + self.format(d.value) + '</p>'; 
            	},

/*
				textLabels:function(d) { 
					var self = this;
					if ((d.name == "Algeria") ||  (d.name == "Cameroon") ||  (d.name == "Ivory Coast") ||  (d.name == "Guinea") ||  (d.name == "Morocco") ||  (d.name == "Guinea Bissau")){return} else if (d.name == "Malta" ){return d.name + "*"} else {return d.name.replace(/1/g, '')}; 
					},
*/

			});