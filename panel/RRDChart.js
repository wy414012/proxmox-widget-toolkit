Ext.define('Proxmox.widget.RRDChart', {
    extend: 'Ext.chart.CartesianChart',
    alias: 'widget.proxmoxRRDChart',

    unit: undefined, // bytes, bytespersecond, percent

    controller: {
	xclass: 'Ext.app.ViewController',

	convertToUnits: function(value) {
	    let units = ['', 'k', 'M', 'G', 'T', 'P'];
	    let si = 0;
	    let format = '0.##';
	    if (value < 0.1) format += '#';
	    while (value >= 1000 && si < units.length -1) {
		value = value / 1000;
		si++;
	    }

	    // javascript floating point weirdness
	    value = Ext.Number.correctFloat(value);

	    // limit decimal points
	    value = Ext.util.Format.number(value, format);

	    return value.toString() + " " + units[si];
	},

	leftAxisRenderer: function(axis, label, layoutContext) {
	    let me = this;
	    return me.convertToUnits(label);
	},

	onSeriesTooltipRender: function(tooltip, record, item) {
	    let view = this.getView();

	    let suffix = '';
	    if (view.unit === 'percent') {
		suffix = '%';
	    } else if (view.unit === 'bytes') {
		suffix = 'B';
	    } else if (view.unit === 'bytespersecond') {
		suffix = 'B/s';
	    }

	    let prefix = item.field;
	    if (view.fieldTitles && view.fieldTitles[view.fields.indexOf(item.field)]) {
		prefix = view.fieldTitles[view.fields.indexOf(item.field)];
	    }
	    let v = this.convertToUnits(record.get(item.field));
	    let t = new Date(record.get('time'));
	    tooltip.setHtml(`${prefix}: ${v}${suffix}<br>${t}`);
	},

	onAfterAnimation: function(chart, eopts) {
	    // if the undo button is disabled, disable our tool
	    let ourUndoZoomButton = chart.header.tools[0];
	    let undoButton = chart.interactions[0].getUndoButton();
	    ourUndoZoomButton.setDisabled(undoButton.isDisabled());
	},
    },

    width: 770,
    height: 300,
    animation: false,
    interactions: [
	{
	    type: 'crosszoom',
	},
    ],
    legend: {
	padding: 0,
    },
    axes: [
	{
	    type: 'numeric',
	    position: 'left',
	    grid: true,
	    renderer: 'leftAxisRenderer',
	    minimum: 0,
	},
	{
	    type: 'time',
	    position: 'bottom',
	    grid: true,
	    fields: ['time'],
	},
    ],
    listeners: {
	animationend: 'onAfterAnimation',
    },

    initComponent: function() {
	let me = this;

	if (!me.store) {
	    throw "cannot work without store";
	}

	if (!me.fields) {
	    throw "cannot work without fields";
	}

	me.callParent();

	// add correct label for left axis
	let axisTitle = "";
	if (me.unit === 'percent') {
	    axisTitle = "%";
	} else if (me.unit === 'bytes') {
	    axisTitle = "Bytes";
	} else if (me.unit === 'bytespersecond') {
	    axisTitle = "Bytes/s";
	} else if (me.fieldTitles && me.fieldTitles.length === 1) {
	    axisTitle = me.fieldTitles[0];
	} else if (me.fields.length === 1) {
	    axisTitle = me.fields[0];
	}

	me.axes[0].setTitle(axisTitle);

	me.updateHeader();

	if (me.header && me.legend) {
	    me.header.padding = '4 9 4';
	    me.header.add(me.legend);
	}

	if (!me.noTool) {
	    me.addTool({
		type: 'minus',
		disabled: true,
		tooltip: gettext('Undo Zoom'),
		handler: function() {
		    let undoButton = me.interactions[0].getUndoButton();
		    if (undoButton.handler) {
			undoButton.handler();
		    }
		},
	    });
	}

	// add a series for each field we get
	me.fields.forEach(function(item, index) {
	    let title = item;
	    if (me.fieldTitles && me.fieldTitles[index]) {
		title = me.fieldTitles[index];
	    }
	    me.addSeries(Ext.apply(
		{
		    type: 'line',
		    xField: 'time',
		    yField: item,
		    title: title,
		    fill: true,
		    style: {
			lineWidth: 1.5,
			opacity: 0.60,
		    },
		    marker: {
			opacity: 0,
			scaling: 0.01,
			fx: {
			    duration: 200,
			    easing: 'easeOut',
			},
		    },
		    highlightCfg: {
			opacity: 1,
			scaling: 1.5,
		    },
		    tooltip: {
			trackMouse: true,
			renderer: 'onSeriesTooltipRender',
		    },
		},
		me.seriesConfig,
	    ));
	});

	// enable animation after the store is loaded
	me.store.onAfter('load', function() {
	    me.setAnimation(true);
	}, this, { single: true });
    },
});
