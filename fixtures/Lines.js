function draw(e,t){t=function(e){const t=[];for(let o=0;o<e.length;o++)t.push(e[o]>>4&15),t.push(15&e[o]);return t}(t),e.lineWidth=.04,e.strokeStyle="#ccc",e.beginPath();for(var o=0;o<=1;o+=.125)e.lineTo(o,(t[0]+16*t[1]+256*t[2]+o)**2.1%1);e.stroke(),e.lineWidth=.02,e.strokeStyle="#666",e.beginPath();for(o=0;o<=1;o+=.125)e.lineTo(o,(t[3]+16*t[4]+256*t[5]+o)**3.1%1);e.stroke(),e.lineWidth=.01,e.strokeStyle="#000",e.beginPath();for(o=0;o<=1;o+=.125)e.lineTo(o,(t[5]+16*t[6]+256*t[7]+o)**4.1%1);e.stroke()}export{draw};
