Ext.define('Proxmox.form.field.Textfield', {
    extend: 'Ext.form.field.Text',
    alias: ['widget.proxmoxtextfield'],

    config: {
        skipEmptyText: true,

        deleteEmpty: false,

        trimValue: false,
    },

    getSubmitData: function () {
        let me = this,
            data = null,
            val;
        if (!me.disabled && me.submitValue && !me.isFileUpload()) {
            val = me.getSubmitValue();
            if (val !== null) {
                data = {};
                data[me.getName()] = val;
            } else if (me.getDeleteEmpty()) {
                data = {};
                data.delete = me.getName();
            }
        }
        return data;
    },

    getSubmitValue: function () {
        let me = this;

        let value = this.processRawValue(this.getRawValue());
        if (me.getTrimValue() && typeof value === 'string') {
            value = value.trim();
        }
        if (value !== '') {
            return value;
        }

        return me.getSkipEmptyText() ? null : value;
    },

    setAllowBlank: function (allowBlank) {
        this.allowBlank = allowBlank;
        this.validate();
    },
});
