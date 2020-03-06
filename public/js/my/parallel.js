let parallel = (function () {

    let svg_parallel = d3.select('#svg_parallel');

    function drawParallel() {
        /*
            1. 现删除之前所画的元素
            2. 然后添加各属性标签
            3. 添加个属性轴
            4. 先添加连线
            5. 后添加属性值矩形，这样可以遮掉连线与矩形重叠部分
        */
        svg_parallel.selectAll('*').remove();
        let svg_width = $("#svg_parallel")[0].scrollWidth;
        let svg_height = $("#svg_parallel")[0].scrollHeight;
        // 2. 添加标签,数组长度代表属性数量
        let labels = [],
            oriName_arr = []
        for (let key in variable.attrValue_dict) {
            labels.push(key)
            oriName_arr.push(variable.oriAttrName_dict[key])
        }

        svg_parallel.append('g').selectAll('text').data(oriName_arr).enter()
            .append('text')
            .attr('x', (d, i) => 0.15 * svg_width + i * svg_width * 0.75 / (labels.length - 1))
            .attr('y', 0.07 * svg_height)
            .style('font-size', 13)
            .style('font-weight', 100)
            .style('color', 'black')
            .style('stroke-width', 1)
            .style('stroke', 'black')
            .style('fill', 'black')
            .style('text-anchor', 'middle')
            .text(d => d)

        //3. 添加时间段轴
        let attrs_line = []
        for (let i = 0; i < labels.length; i++) {
            attrs_line.push(
                [
                    [0.15 * svg_width + i * svg_width * 0.75 / (labels.length - 1),
                        0.1 * svg_height
                    ],
                    [0.15 * svg_width + i * svg_width * 0.75 / (labels.length - 1),
                        0.9 * svg_height
                    ]
                ]
            )
        }

        let line = d3.line()
            .x(d => d[0])
            .y(d => d[1])

        svg_parallel.append('g').selectAll('path').data(attrs_line).enter()
            .append('path')
            .attr('d', d => line(d))
            .attr('stroke', 'white')
            .attr('stroke-width', 2);



        /*4.
            一条线代表一个节点在各个属性轴上相应位置的连线,由于画线的数据只能有坐标点，
            所以如果给线赋予id，需要一个id数组对应坐标数组, 
            将属性值对应在varible属性字典里的index
            减少交叉？给每条线标号，使该线在各属性轴上对应的位置尽量靠上
                1. 需要一个属性值对应线id数组的字典，id顺序由遍历nodeInfo数据确定    
                2. value_arr数组用来画线的时候，其对应的下标就是线的id
                3. 
                */

        /* 5.
            画每条轴上面的属性值长方形，高度映射点的数量,需要每个属性值的点数量字典，需要遍历一遍原始数据
            
            每种属性分开绘画
            每次都将将属性值以字典的方式存入数组，有attrValue和count 两个属性
        */
        let rect_arr = [],
            attrValue_arr = [],
            unitHeight
        for (let i = 0; i < labels.length; i++) {
            let valueObj_arr = [],
                tmp_attrValueArr = [],
                nodesCount = 0
            for (let v in variable.valueIds_dict[labels[i]]) {
                let tmpObj = {
                    'attrValue': v,
                    'count': variable.valueIds_dict[labels[i]][v].length
                }
                nodesCount += variable.valueIds_dict[labels[i]][v].length
                tmp_attrValueArr.push(v)
                valueObj_arr.push(tmpObj)
            }
            attrValue_arr.push(tmp_attrValueArr)
            rect_arr.push(valueObj_arr)
            //将高度单位化，代表每个点在轴i上所拥有的高度
            unitHeight = (0.8 / nodesCount) * svg_height
        }
        console.log("drawParallel -> rect_arr", rect_arr)

        /*保留各属性的属性值的index, 
            此处不用  for (let attr in variable.nodeInfo[id]) 来读取点的属性值
            是因为这个的属性顺序与label的顺序不一定保持一致，即属性轴的属性顺序不一定一致
            所以使用循环label来获取属性值
            属性轴的排列顺序按variable.attrValue_dict里的key顺序排列，
            每条轴上面属性值从上到下的顺序为variable.attrValue_dict[key]的属性值顺序
        */
        let ids_arr = [],
            line_arr = [];
        console.log("drawParallel -> variable.valueIds_dict", variable.valueIds_dict)

        for (let id in variable.nodeInfo) {
            ids_arr.push(id)

            let tmp_line = [];
            for (let j = 0; j < labels.length; j++) {
                let tmp_attrValue = variable.nodeInfo[id][labels[j]]
                //计算先前属性所占高度
                let preHeight = 0
                let vi = attrValue_arr[j].indexOf(tmp_attrValue)
                vi -= 1
                while (vi >= 0) {
                    preHeight += rect_arr[j][vi]['count'] * unitHeight
                    vi -= 1
                }

                /*tmp_index：  由于是根据遍历每一点来生成variable.attrValue_dict的，
                    所以该属性值上id排列顺序就是按该点在该属性值上的最先排列点
                */
                //加上在该属性值上的排列顺序
                let tmp_index = variable.valueIds_dict[labels[j]][tmp_attrValue].indexOf(id)
                preHeight += tmp_index * unitHeight
                tmp_line.push([0.15 * svg_width + j * svg_width * 0.75 / (labels.length - 1),
                    0.1 * svg_height + preHeight
                ])
            }
            line_arr.push(tmp_line)
        }

        // console.log('value_arr: ', value_arr);
        let test = 0
        for (let key in variable.cluster_dict) {
            test += 1
        }
        console.log(test)
        // console.log('line_arr: ', line_arr);
        // console.log('links: ', value_arr);
        let line_cluster = d3.line()
            .x(d => d[0])
            .y(d => d[1])
        let lines = svg_parallel.append('g').selectAll('path').data(line_arr).enter()
            .append('path')
            .attr('d', d => line_cluster(d))
            .attr('id', (d, i) => 'parallel_' + ids_arr[i])
            .attr('class', (d, i) => {
                if (ids_arr[i] in variable.cluster_dict)
                    return 'parallelClass_' + variable.cluster_dict[ids_arr[i]].cluster
            })
            .style('stroke', '#b0b0b0')
            .style('stroke-width', 1)
            .style('fill', 'none')
            .style('opacity', .05)
            .on('click', function (d, i) {
                console.log(i);
            })



        /* 5.
            画每条轴上面的属性值长方形，高度映射点的数量,需要每个属性值的点数量字典，需要遍历一遍原始数据
            每种属性分开绘画
            画对应属性值的text
            每次都将将属性值以字典的方式存入数组，有attrValue和count 两个属性
        */

        for (let i = 0; i < rect_arr.length; i++) {

            svg_parallel.append('g').selectAll('rect').data(rect_arr[i]).enter()
                .append('rect')
                .attr('x', 0.15 * svg_width + i * svg_width * 0.75 / (labels.length - 1) - 5)
                .attr('y', (d, vi) => {
                    let preHeight = 0
                    vi -= 1
                    //计算先前属性所占高度
                    while (vi >= 0) {
                        preHeight += rect_arr[i][vi]['count'] * unitHeight
                        vi -= 1
                    }
                    return 0.1 * svg_height + preHeight
                })
                .attr('width', 10)
                .attr('height', d => unitHeight * d.count - 5)
                // .style('stroke', '#dddddd') //i代表属性下标，并不是代表当前值的下标
                // .style('stroke-width', 2)
                .style('fill', variable.attr_color[i])
                .attr('id', d => 'rect_' + labels[i] + '_' + d.attrValue) //id : rect_属性_属性值



            //添加具体的属性值标签
            let valueTexts =  clusterFun.deepCopy(variable.attrValue_dict[labels[i]])
            if (i == 1) {
                for (let i = 0; i < valueTexts.length; i++) {
                    valueTexts[i] = variable.yearPhase_dict[valueTexts[i]]
                }
            }


            svg_parallel.append('g').selectAll('text').data(valueTexts).enter()
                .append('text')
                .attr('x', 0.15 * svg_width + i * svg_width * 0.75 / (labels.length - 1) - 12)
                .attr('y', (d, vi) => {
                    let preHeight = rect_arr[i][vi]['count'] * unitHeight / 2
                    vi -= 1
                    //计算先前属性所占高度
                    while (vi >= 0) {
                        preHeight += rect_arr[i][vi]['count'] * unitHeight
                        vi -= 1
                    }
                    return 0.1 * svg_height + preHeight
                })
                .style('font-size', 10)
                .style('font-weight', 100)
                .style('color', 'black')
                .style('stroke-width', 1)
                .style('stroke', 'black')
                .style('fill', 'black')
                .style('text-anchor', 'end')
                .text(d => d)
        }
    }


    function changeWidth(cluster) {
        let svg_width = $("#svg_parallel")[0].scrollWidth;
        let svg_height = $("#svg_parallel")[0].scrollHeight;
        let ids = variable.cluster_ids_dict[cluster],
            tmpValueIds_dict = {},
            attrCount = 0
        console.log("changeWidth -> variable.attrValue_dict", variable.attrValue_dict)

        //初始化点的数量字典
        for (let key in variable.attrValue_dict) {
            attrCount += 1
            tmpValueIds_dict[key] = {}
            for (let i = 0; i < variable.attrValue_dict[key].length; i++) {
                let tmp_attrValue = variable.attrValue_dict[key][i]
                tmpValueIds_dict[key][tmp_attrValue] = 0
            }
        }
        //遍历点数组，给字典赋值
        let maxCount = -Infinity,
            minCount = Infinity
            
        for (let i = 0; i < ids.length; i++) {
            for (let attr in variable.nodeInfo[ids[i]]) {
                let tmpValue = variable.nodeInfo[ids[i]][attr]
                tmpValueIds_dict[attr][tmpValue] += 1
                if (tmpValueIds_dict[attr][tmpValue] > maxCount)
                    maxCount = tmpValueIds_dict[attr][tmpValue]
                if (tmpValueIds_dict[attr][tmpValue] < minCount)
                    minCount = tmpValueIds_dict[attr][tmpValue]
            }
        }
        console.log("changeWidth -> maxCount", maxCount)
        console.log("changeWidth -> minCount", minCount)
        console.log("changeWidth -> tmpValueIds_dict", tmpValueIds_dict)

        //设置宽度比例尺
        let widthScale = d3.scaleLinear().domain([minCount, maxCount]).range([4, 15])
        //修改rect宽度
        let index = 0
        for (let attr in tmpValueIds_dict) {
            for (let v in tmpValueIds_dict[attr]) {
                d3.select('#rect_' + attr + '_' + v)
                    .attr('x', function(){
                        let oriX = 0.15 * svg_width + index * svg_width * 0.75 / (attrCount - 1)
                        return oriX - widthScale(tmpValueIds_dict[attr][v]) / 2;
                    })
                    .transition()
                    .duration(1000)
                    .attr('width', widthScale(tmpValueIds_dict[attr][v]))

            }
            index += 1
        }


    }
    return {
        drawParallel,
        changeWidth
    }
})()