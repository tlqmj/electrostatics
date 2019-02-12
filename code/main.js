var Module = {
  onRuntimeInitialized: function() {
    sim = new Simulation(101, 101);
    plot = {
      div: 'plotPane',
      data: [{
        z:sim.v.data,
        type:'surface',
        colorscale:'Viridis',
        aspectratio: {x: 1, y: 1},
        ncontours: 30,
        contours: {
          x: {highlight: false},
          y: {highlight: false},
          coloring: 'heatmap',
          showlabels:true,
          labelfont: {
            size: 12,
            color: 'white'
          },
        },
        line: {
          color: 'white'
        },
        colorbar: {
          titleside: 'right',
          ticksuffix: " V",
          thickness: 10,
          thicknessmode: 'pixels'
        },
        zsmooth: 'best'
      }],
      layout: {
        scene: {
          xaxis: {
            showspikes: false
          },
          yaxis: {
            showspikes: false
          },
          zaxis: {
            ticksuffix: " V",
            showspikes: false
          }
        }
      },
      options: {responsive: true}
    }

    buttons = {
      'surface': document.getElementById('surface'),
      'contour': document.getElementById('contour')
    }

    document.getElementById('scenarios').addEventListener('change', function(change) {select_scenario(change.target.value)});
    document.getElementById('plot_type').addEventListener('change', function(change) {select_plot_type(change.target.value)});

    plot.data[0].type = document.getElementById('plot_type').value; // FIX ME: Ugly
    select_scenario(document.getElementById('scenarios').value);
  }
}

function draw_plot(type) {
  if (type !== undefined) plot.data[0].type = type;
  Plotly.newPlot(plot.div, plot.data, plot.layout, plot.options)
}

function select_plot(type) {
  if (!Object.keys(buttons).includes(type)) throw "ARGUMENT ERROR in set_plot. No such plot type."
  if (plot.data[0].type != type) {
    Object.values(buttons).forEach( button => {
      button.classList.remove("button-primary");
    })
    buttons[type].classList.add("button-primary");
    Plotly.restyle(plot.div, {type: type})
  }
}

function select_plot_type(type) {
    switch (type) {
      case "surface":
        draw_plot("surface");
        break;
      case "contour":
        draw_plot("contour");
        break;
      default:
        throw "ARGUMENT ERROR in select_plot_type. No such plot type."
    }
}

function select_scenario(scenario) {
  sim.clear();
  switch (scenario) {
    case "dipole":
      sim.add_electrode(50, 40,  10);
      sim.add_electrode(50, 60, -10);
      break;
    case "capacitor":
      for (var i = 29; i < 70; i++) {
        sim.add_electrode(i, 40,  10);
        sim.add_electrode(i, 60, -10);
      }
      break;
    default:
      throw "ARGUMENT ERROR in select_scenario. Invalid scenario";
      break;
  }
  sim.run(1.75, 10000, 1e-6);
  draw_plot();
}
