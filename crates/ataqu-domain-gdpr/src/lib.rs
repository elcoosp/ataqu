pub mod registry;
pub mod saga;

pub struct GdprRegistry {
    pub tables: Vec<GdprTable>,
}

pub struct GdprTable {
    pub schema: String,
    pub table: String,
    pub tenant_id_column: String,
}

impl GdprRegistry {
    pub fn new() -> Self {
        Self {
            tables: vec![
                GdprTable {
                    schema: "collab_crm".into(),
                    table: "contacts".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_crm".into(),
                    table: "deals".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "employees".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "leave_requests".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "vault".into(),
                    table: "products".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "vault".into(),
                    table: "variants".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "dial".into(),
                    table: "channels".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "dial".into(),
                    table: "messages".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "core".into(),
                    table: "users".into(),
                    tenant_id_column: "tenant_id".into(),
                },
            ],
        }
    }
}
