function showHalfPiGraph(data, selector) {
    var w = 200,                        //width
    h = 100,                            //height
    r = 100,                            //radius
    ir = 50,
    pi = Math.PI,
    color = d3.scale.category20c();     
    
    var vis = d3.select(selector) 
        .data([data])          
            .attr("width", w)  
            .attr("height", h)
        .append("svg:g")       
            .attr("transform", "translate(" + r + "," + r + ")")    
 
    var arc = d3.svg.arc()              
        .outerRadius(r)
		.innerRadius(ir);
 
    var pie = d3.layout.pie()           
        .value(function(d) { return d.value; })
        .startAngle(-90 * (pi/180))
        .endAngle(90 * (pi/180));
 
    var arcs = vis.selectAll("g.slice")     
        .data(pie)                          
        .enter()                            
            .append("svg:g")                
                .attr("class", "slice");    
 
        arcs.append("svg:path")
                .attr("fill", function(d, i) { return color(i); } ) 
                .attr("d", arc);                                    
 
        arcs.append("svg:text")                                     
                .attr("transform", function(d) {                    

                return "translate(" + arc.centroid(d) + ")";        
            })
            .attr("text-anchor", "middle")                          
            .text(function(d, i) { return data[i].label; });        
    
}