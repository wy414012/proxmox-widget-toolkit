Ext.define('pmx-permissions', {
    extend: 'Ext.data.TreeModel',
    fields: [
        'text',
        'type',
        {
            type: 'boolean',
            name: 'propagate',
        },
    ],
});

Ext.define('Proxmox.panel.PermissionViewPanel', {
    extend: 'Ext.tree.Panel',
    xtype: 'proxmoxPermissionViewPanel',

    scrollable: true,
    layout: 'fit',
    rootVisible: false,
    animate: false,
    sortableColumns: false,

    auth_id_name: 'userid',
    auth_id: undefined,

    columns: [
        {
            xtype: 'treecolumn',
            header: gettext('Path') + '/' + gettext('Permission'),
            dataIndex: 'text',
            flex: 6,
        },
        {
            header: gettext('Propagate'),
            dataIndex: 'propagate',
            flex: 1,
            renderer: function (value) {
                if (Ext.isDefined(value)) {
                    return Proxmox.Utils.format_boolean(value);
                }
                return '';
            },
        },
    ],

    initComponent: function () {
        let me = this;

        Proxmox.Utils.API2Request({
            url:
                '/access/permissions?' +
                encodeURIComponent(me.auth_id_name) +
                '=' +
                encodeURIComponent(me.auth_id),
            method: 'GET',
            failure: function (response, opts) {
                Proxmox.Utils.setErrorMask(me, response.htmlStatus);
            },
            success: function (response, opts) {
                Proxmox.Utils.setErrorMask(me, false);
                let result = Ext.decode(response.responseText);
                let data = result.data || {};

                let root = {
                    name: '__root',
                    expanded: true,
                    children: [],
                };
                let idhash = {
                    '/': {
                        children: [],
                        text: '/',
                        type: 'path',
                    },
                };
                Ext.Object.each(data, function (path, perms) {
                    let path_item = {
                        text: path,
                        type: 'path',
                        children: [],
                    };
                    Ext.Object.each(perms, function (perm, propagate) {
                        let perm_item = {
                            text: perm,
                            type: 'perm',
                            propagate: propagate === 1 || propagate === true,
                            iconCls: 'fa fa-fw fa-unlock',
                            leaf: true,
                        };
                        path_item.children.push(perm_item);
                        path_item.expandable = true;
                    });
                    idhash[path] = path_item;
                });

                Ext.Object.each(idhash, function (path, item) {
                    let parent_item = idhash['/'];
                    if (path === '/') {
                        parent_item = root;
                        item.expanded = true;
                    } else {
                        let split_path = path.split('/');
                        while (split_path.pop()) {
                            let parent_path = split_path.join('/');
                            if (idhash[parent_path]) {
                                parent_item = idhash[parent_path];
                                break;
                            }
                        }
                    }
                    parent_item.children.push(item);
                });

                me.setRootNode(root);
            },
        });

        me.callParent();

        me.store.sorters.add(
            new Ext.util.Sorter({
                sorterFn: function (rec1, rec2) {
                    let v1 = rec1.data.text,
                        v2 = rec2.data.text;
                    if (rec1.data.type !== rec2.data.type) {
                        v2 = rec1.data.type;
                        v1 = rec2.data.type;
                    }
                    if (v1 > v2) {
                        return 1;
                    } else if (v1 < v2) {
                        return -1;
                    }
                    return 0;
                },
            }),
        );
    },
});

Ext.define('Proxmox.PermissionView', {
    extend: 'Ext.window.Window',
    alias: 'widget.userShowPermissionWindow',
    mixins: ['Proxmox.Mixin.CBind'],

    scrollable: true,
    width: 800,
    height: 600,
    layout: 'fit',
    cbind: {
        title: (get) =>
            Ext.String.htmlEncode(get('auth_id')) + ` - ${gettext('Granted Permissions')}`,
    },
    items: [
        {
            xtype: 'proxmoxPermissionViewPanel',
            cbind: {
                auth_id: '{auth_id}',
                auth_id_name: '{auth_id_name}',
            },
        },
    ],
});
