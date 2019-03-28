let forceChart = (function () {
    let forceWidth = $('#svg_force')[0].scrollWidth;
    let forceHeight = $('#svg_force')[0].scrollHeight;

    function drawStaticForce(nodes, links, cluster_dict) {
        let color = d3.scaleOrdinal(d3.schemeCategory20);
        //绘制节点
        let node = variable.svg_force.append('g').selectAll('circle').data(nodes).enter()
            .append('circle')
            .attr('r', 2)
            .attr('cx', function (d) { return d.x; })
            .attr('cy', function (d) { return d.y; })
            .attr('stroke', function (d) {
                d.cluster = cluster_dict[d.id];
                if (d.cluster != -1 && d.cluster != undefined)
                    return color(d.cluster)
                else
                    return 'black';
            }).attr('fill', function (d) {
                if (d.cluster != -1 && d.cluster != undefined)
                    return color(d.cluster)
                else
                    return 'black';
            }).attr('class', function (d) {
                return d.id;
            });

        let line = d3.line()
            .x(function (d) { return d[0] })
            .y(function (d) { return d[1] })
        let link = variable.svg_force.append('g').selectAll('path').data(links).enter()
            .append('path')
            .attr('d', function (d) { return line(d.loc) })
            .attr('stroke', function (d) {
                let s_cluster = cluster_dict[d.source];
                let t_cluster = cluster_dict[d.target];
                if (s_cluster === t_cluster)
                    return color(parseInt(s_cluster));
                else
                    return 'gray';
            }).attr('stroke-width', 1)
            .attr('opacity', 0.1)
            .attr('class', function (d) {
                return d.source + '_' + d.target;
            })

    }

    //绘制簇内点的原始力引导图
    function drawClusterForce(links) {
        console.log(1);
        let forceClusterWidth = $('#svg_oriTopo')[0].scrollWidth;
        let forceClusterHeight = $('#svg_oriTopo')[0].scrollHeight;
        let svg_cluster = d3.select('#svg_oriTopo');
        svg_cluster.selectAll('*').remove();
        let nodes = [], nodes_dict = {};
        for (let i = 0; i < links.length; i++) {
            if (nodes_dict[links[i].source] == undefined)
                nodes_dict[links[i].source] = true;
            if (nodes_dict[links[i].target] == undefined)
                nodes_dict[links[i].target] = true;
        }
        for (let key in nodes_dict) {
            nodes.push({ 'id': key });
        }
        let simulation_cluster = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().distanceMax(50))
            .force("link", d3.forceLink(links).id(d => d.id))
            .force("center", d3.forceCenter(forceClusterWidth / 2, forceClusterHeight / 2))
        let drag_cluster = simulation_cluster => {

            function dragstarted(d) {
                if (!d3.event.active) simulation_cluster.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }

            function dragended(d) {
                if (!d3.event.active) simulation_cluster.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        //设置tick函数
        simulation_cluster.on("tick", () => {
            link_cluster
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node_cluster
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

        })
        //画线
        let link_cluster = svg_cluster.append('g').selectAll('line').data(links).enter()
            .append('line')
            .attr('stroke', '#bfbfbf')
            .attr('opacity', 0.5)
            .attr('stroke-width', 2)
        //画点
        let node_cluster = svg_cluster.append('g').selectAll('circle').data(nodes).enter()
            .append('circle')
            .attr('r', 3)
            .attr('stroke', '#b4b4ff')
            .attr('fill', '#b4b4ff')
            .call(drag_cluster(simulation_cluster));


    }


    //************绘制聚类后的力引导图************

    function Clustering(clusterids_dict, clusterLinks_dict, cluster_dict) {
        console.log('clusterLinks_dict: ', clusterLinks_dict);
        variable.svg_force.selectAll('*').remove();
        //直接只画类的点，不画类内的点
        let cluster_links = [], cluster_nodes = [];
        let r_extent = [], lineW_extent = [];
        let color = d3.scaleOrdinal(d3.schemeCategory20);

        //*********统计每个簇内的点数量**********
        for (let key in clusterids_dict) {
            let tmp_dict = {};
            tmp_dict['id'] = key;
            tmp_dict['value'] = parseInt(clusterids_dict[key].length);
            cluster_nodes.push(tmp_dict);
        }
        let index_dict = {};
        for (let i = 0; i < cluster_nodes.length; i++) {
            index_dict[cluster_nodes[i].id] = i;
        }
        //设置半径的比例尺
        r_extent = d3.extent(cluster_nodes, function (d) { return d.value; })
        let rScale = d3.scaleLinear().domain(r_extent).range([5, 20]);
        //***********统计每条连线的权重************
        let bundling_edge = [];
        for (let key in clusterLinks_dict) {
            if (key.split('-')[0] != key.split('-')[1]) {
                let tmp_dict = {};
                tmp_dict['source'] = key.split('-')[0];
                tmp_dict['target'] = key.split('-')[1];
                tmp_dict['value'] = parseInt(clusterLinks_dict[key]);
                cluster_links.push(tmp_dict);
                let tmp_bundling = {};
                tmp_bundling['source'] = index_dict[key.split('-')[0]];
                tmp_bundling['target'] = index_dict[key.split('-')[1]];
                tmp_bundling['weight'] = parseInt(clusterLinks_dict[key]);
                bundling_edge.push(tmp_bundling);
            }
        }
        //******设置线宽的比例尺**********
        lineW_extent = d3.extent(cluster_links, function (d) { return d.value; })

        console.log('cluster_links: ', cluster_links);
        let LWScale = d3.scaleLinear().domain(lineW_extent).range([1, 6]);
        let OPScale = d3.scaleLinear().domain(lineW_extent).range([0.05, 0.5]);
        console.log('lineW_extent: ', lineW_extent);
        let index = 0;
        while (index < cluster_links.length) {
            if (LWScale(cluster_links[index].value) < 1.5){
                bundling_edge.splice(index, 1)
                cluster_links.splice(index, 1)
            }
            else
                index += 1;
        }

        //设置力的作用
        let simulation = d3.forceSimulation(cluster_nodes)
            .force("charge", d3.forceManyBody().strength(-3500).distanceMax(300))
            .force("link", d3.forceLink(cluster_links).id(d => d.id))
            .force("center", d3.forceCenter(forceWidth / 2, forceHeight / 2))

        let drag = simulation => {

            function dragstarted(d) {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }

            function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }



        //画线
        let link = variable.svg_force.append('g').selectAll('line').data(cluster_links).enter()
            .append('line')
            .attr('stroke', function (d) {
                if (d.source.id === d.target.id)
                    return color(d.target.id);
                else
                    return '#c5c5c5';
            }).attr('stroke-width', function (d) {
                return LWScale(d.value);
            })
            .attr('opacity', function (d) {
                return OPScale(d.value);
            })
            .attr('class', 'force_link')
            .attr('id', function (d) {
                return d.source + '_' + d.target;
            })



        //画点
        let node = variable.svg_force.append('g').attr('class', 'node').selectAll('circle').data(cluster_nodes).enter()
            .append('circle')
            .attr('r', function (d) {
                return rScale(d.value);
            })
            .attr('stroke', function (d) {
                // if (d.id != -1)
                //     return color(d.id)
                // else
                //     return 'black';
                return '#004358';
            }).attr('fill', function (d) {
                // if (d.id != -1)
                //     return color(d.id)
                // else
                //     return 'black';
                return '#004358';
            }).attr('class', function (d) {
                return 'cluster_node';
            }).attr('id', d => 'cluster_' + d.id)
            .on('click', function (d,i) {
                const a = i;
                console.log(a)
                if (variable.last_cluster != undefined) {
                    d3.select('#area_' + variable.last_cluster).attr('fill', '#D5E2FF');
                    d3.select('#cluster_' + variable.last_cluster).attr('fill', '#329CCB');
                    d3.select('#tree_' + variable.last_cluster).attr('fill', '#B6E9FF').attr('stroke', '#329CCB')
                }
                d3.select('#area_' + d.id).attr('fill', '#E83A00');
                d3.select('#cluster_' + d.id).attr('fill', '#E83A00');
                d3.select('#tree_' + d.id).attr('fill', '#FFC889').attr('stroke', '#E83A00')
                variable.last_cluster = d.id;
                console.log(d.id)
                //雷达图
                radarChart.draw(d.id);

                mapView.drawPL(variable.clu_tpg[d.id], variable.cluster_ids_dict[d.id]);

                //平行坐标轴
                // parallel.drawParallel(d.id);
                // forceChart.drawPie(d.id);
                // drawClusterForce(clusterFun.deepCopy(variable.clu_tpg[d.id]));
            });

        //画园内的pattern

        let pattern_g = [], pieArr = [];
        for (let i = 0; i < cluster_nodes.length; i++) {
            let pie_g = drawPie(cluster_nodes[i].id, rScale(cluster_nodes[i].value));
            let tmp_g = drawTopo(Math.floor(Math.random() * 5), rScale(cluster_nodes[i].value));
            pattern_g.push({ node: tmp_g[0], link: tmp_g[1], value: cluster_nodes[i].value });
            pieArr.push(pie_g);
        }
        //画圆外的属性方差值
        // for()
        // console.log('pattern_g: ', pattern_g);

        let radian_dict = {
            'left_top': 162 * (2 * Math.PI / 360),
            'left_bottom': 234 * (2 * Math.PI / 360),
            'right_top': 18 * (2 * Math.PI / 360),
            'right_bottom': 308 * (2 * Math.PI / 360)
        }
        console.log('cluster_nodes: ', cluster_nodes);

        //设置tick函数
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            for (let i = 0; i < pattern_g.length; i++) {
                pattern_g[i].node.attr('transform', "translate(" + cluster_nodes[i].x + ',' + cluster_nodes[i].y + ')');
                pattern_g[i].link.attr('transform', "translate(" + cluster_nodes[i].x + ',' + cluster_nodes[i].y + ')');
                pieArr[i].attr('transform', "translate(" + cluster_nodes[i].x + ',' + cluster_nodes[i].y + ')');
            }

        });

        $('#edge_bundling').on('click', () => {
            edgeBundling(cluster_nodes, bundling_edge, clusterLinks_dict)
        })

    }

    //***************边邦定***************
    function edgeBundling(cluster_nodes, bundling_edge, clusterLinks_dict) {

        d3.selectAll('.force_link').remove();

        //***********布局稳定后进行边邦定************
        var fbundling = d3.ForceEdgeBundling()
            .nodes(cluster_nodes)
            .edges(bundling_edge);
        var results = fbundling();
        console.log('results: ', results);
        for (let i = 0; i < results.length; i++) {
            let tmp_key = results[i][0].id + '-' + results[i][results[i].length - 1].id
            results[i].value = clusterLinks_dict[tmp_key]
        }

        let lineW_extent = d3.extent(results, function (d) { return d.value; })
        let OPScale = d3.scaleLinear().domain(lineW_extent).range([0.2, 0.8]);
        let LWScale = d3.scaleLinear().domain(lineW_extent).range([1, 6]);

       
        var d3line = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveBundle)

        variable.svg_force.insert("g", '.node').selectAll('path').data(results).enter()
            .append('path')
            .attr("d", d => d3line(d))
            .attr("stroke-width", d => LWScale(d.value))
            .attr("stroke", "#c5c5c5")
            .attr("fill", "none")
            .attr('stroke-opacity', d=>OPScale(d.value));
    }

    //画圆外的扇形
    function drawPie(cluster, radius) {
        let tmp_tpg = clusterFun.deepCopy(variable.clu_tpg[cluster]);
        let tmp_attrs = variable.param.comb.split('_');
        tmp_attrs.shift()
        //计算总和
        // let attrs_value = new Array(5).fill(0);
        // for (let i = 0; i < tmp_tpg.length; i++) {
        //     for (let j = 0; j < 5; j++) {
        //         attrs_value[j] += tmp_tpg[i].value[j];
        //     }
        // }

        let attrs_value = new Array(5).fill(0);
        let tmp_ids = variable.cluster_ids_dict[cluster]
        let value_arr = [];
        for (let i = 0; i < tmp_ids.length; i++) {
            let tmp_targets = variable.station_links_dict[tmp_ids[i]];
            let inner_value = new Array(5).fill(0), outer_value = new Array(5).fill(0);
            for (let j = 0; j < tmp_targets.length; j++) {
                let tmp_link_key = Math.min(parseInt(tmp_ids[i]), parseInt(tmp_targets[j])) + '_' + Math.max(parseInt(tmp_ids[i]), parseInt(tmp_targets[j]));
                if (tmp_ids.indexOf(tmp_targets[j]) != -1)
                    for (let a = 0; a < 5; a++)
                        inner_value[a] += variable.period_dict[tmp_link_key][a]
                if (tmp_ids.indexOf(tmp_targets[j]) == -1)
                    for (let a = 0; a < 5; a++)
                        outer_value[a] += variable.period_dict[tmp_link_key][a]
            }
            let ratio_arr = new Array(5);
            for (let a = 0; a < 5; a++) {
                if (inner_value[a] == 0 && outer_value[a] == 0)
                    ratio_arr[a] = 0;
                else
                    ratio_arr[a] = inner_value[a] / (inner_value[a] + outer_value[a])
            }
            value_arr.push(ratio_arr);

            for (let a = 0; a < ratio_arr.length; a++) {
                attrs_value[a] += ratio_arr[a] / tmp_ids.length;
            }
        }

        //计算方差
        // let attrs_value = calVariance(tmp_tpg);
        // for(let i = 0; i < attrs_value.length; i++){
        //     attrs_value[i] = 1 / attrs_value[i];
        // }
        let rScale = d3.scaleLinear()
            .domain(d3.extent(attrs_value))
            .range([radius * 1.2, radius * 2.3])


        let pie_data = d3.pie()(attrs_value)
        for (let i = 0; i < pie_data.length; i++) {
            pie_data[i].startAngle = i * Math.PI * 2 / pie_data.length;
            pie_data[i].endAngle = (i + 1) * Math.PI * 2 / pie_data.length;
            pie_data[i].innerRadius = radius;
            pie_data[i].outerRadius = rScale(pie_data[i].data);
        }
        // let r_scale = 


        let arc = d3.arc()
            .innerRadius(radius)
            .outerRadius(d => rScale(d.data))
            .cornerRadius(d => (d.outerRadius - d.innerRadius) / 5)
            .padAngle(.02)

        let pie_g = variable.svg_force.append('g').selectAll('path').data(pie_data).enter()
            .append('path')
            .attr('d', d => arc(d))
            .attr('fill', function (d, i) {
                // if (tmp_attrs.indexOf(i.toString()) != -1) {
                //     return color[i]
                // } else {
                //     return 'grey'
                // }
                return variable.attr_color[i];
            })
            .attr('stroke', function (d, i) {
                // if (tmp_attrs.indexOf(i.toString()) != -1) {
                //     return color[i]
                // } else {
                //     return 'grey'
                // }
                return variable.attr_color[i]
            })
            .attr('stroke-width', 0.1)
        // console.log('pie_data: ', pie_data);
        return pie_g;
    }

    function calVariance(link_arr) {
        let varianceArr = new Array(5).fill(0), ave_arr = new Array(5).fill(0);
        for (let i = 0; i < link_arr.length; i++) {
            for (let j = 0; j < 5; j++)
                ave_arr[j] += link_arr[i].value[j] / link_arr.length;
        }
        for (let i = 0; i < link_arr.length; i++) {
            for (let j = 0; j < 5; j++) {
                varianceArr[j] += Math.pow(ave_arr[j] - link_arr[i].value[j], 2) / link_arr.length;
            }
        }
        return varianceArr;
    }


    function drawTopo(topo_type, radius) {
        let topo_nodes = [], topo_links = [];
        let radian_dict = {
            'left_top': 162 * (2 * Math.PI / 360),
            'left_bottom': 234 * (2 * Math.PI / 360),
            'right_bottom': 308 * (2 * Math.PI / 360),
            'right_top': 18 * (2 * Math.PI / 360)
        }
        if (topo_type == 0) {
            //*************环***************
            topo_nodes.push({ x: 0, y: -2 * radius / 3 });
            for (let key in radian_dict) {
                topo_nodes.push({ x: Math.cos(radian_dict[key]) * 2 * radius / 3, y: -Math.sin(radian_dict[key]) * 2 * radius / 3 });
            }
            for (let i = 0; i < 4; i++) {
                topo_links.push([topo_nodes[i], topo_nodes[i + 1]]);
            }
            topo_links.push([topo_nodes[4], topo_nodes[0]]);

        } else if (topo_type == 1) {
            //*************弱连通***************
            topo_nodes.push({ x: 0, y: -2 * radius / 3 });
            for (let key in radian_dict) {
                topo_nodes.push({ x: Math.cos(radian_dict[key]) * 2 * radius / 3, y: -Math.sin(radian_dict[key]) * 2 * radius / 3 });
            }
            topo_nodes.push({ x: 0, y: 0 });
            for (let i = 0; i < 4; i++) {
                topo_links.push([topo_nodes[i], topo_nodes[i + 1]]);
            }
            topo_links.push([topo_nodes[4], topo_nodes[0]]);
            topo_links.push([topo_nodes[5], topo_nodes[0]]);
            topo_links.push([topo_nodes[5], topo_nodes[2]]);
            topo_links.push([topo_nodes[5], topo_nodes[3]]);


        } else if (topo_type == 2) {
            //*************强连通***************
            topo_nodes.push({ x: 0, y: -2 * radius / 3 });
            for (let key in radian_dict) {
                topo_nodes.push({ x: Math.cos(radian_dict[key]) * 2 * radius / 3, y: -Math.sin(radian_dict[key]) * 2 * radius / 3 });
            }
            for (let i = 0; i < 4; i++) {
                topo_links.push([topo_nodes[i], topo_nodes[i + 1]]);
            }
            topo_links.push([topo_nodes[4], topo_nodes[0]]);
            topo_links.push([topo_nodes[0], topo_nodes[2]]);
            topo_links.push([topo_nodes[0], topo_nodes[3]]);
            topo_links.push([topo_nodes[1], topo_nodes[4]]);
            topo_links.push([topo_nodes[1], topo_nodes[3]]);
            topo_links.push([topo_nodes[2], topo_nodes[4]]);

        } else if (topo_type == 3) {
            //*************环中心发散***************
            topo_nodes.push({ x: 0, y: -2 * radius / 3 });
            for (let key in radian_dict) {
                topo_nodes.push({ x: Math.cos(radian_dict[key]) * 2 * radius / 3, y: -Math.sin(radian_dict[key]) * 2 * radius / 3 });
            }
            topo_nodes.push({ x: 0, y: 0 });
            for (let i = 0; i < 5; i++) {
                topo_links.push([topo_nodes[5], topo_nodes[i]]);
            }
        } else {
            //*************链***************
            for (let i = 0; i < 3; i++) {
                topo_nodes.push({ x: (-1 + i) * 2 * radius / 3, y: 0 });
            }
            for (let i = 0; i < 2; i++) {
                topo_links.push([topo_nodes[i], topo_nodes[i + 1]]);
            }
        }
        let topo_node_g = variable.svg_force.append('g').selectAll('circle').data(topo_nodes).enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', radius / 8)
            .attr('fill', 'white')
            .attr('stroke', 'white')

        let line = d3.line()
            .x(function (d) { return d.x })
            .y(function (d) { return d.y })
            .curve(d3.curveBasis)

        let topo_link_g = variable.svg_force.append('g').selectAll('path').data(topo_links).enter()
            .append('path')
            .attr('d', function (d) { return line(d) })
            .attr('stroke', 'white')
            .attr('stroke-width', radius / 12)
            .attr('fill', 'none')
        return [topo_node_g, topo_link_g];

    }

    return {
        drawStaticForce,
        Clustering,
        drawPie
    }
}())