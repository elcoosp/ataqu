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

#[allow(clippy::new_without_default)]
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
                    schema: "dial".into(),
                    table: "threads".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "dial".into(),
                    table: "mentions".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "dial".into(),
                    table: "reactions".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_crm".into(),
                    table: "activities".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_crm".into(),
                    table: "tasks".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_crm".into(),
                    table: "pipeline_stages".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "documents".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "databases".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "blocks".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "forms".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "responses".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "bookings".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "event_types".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "collab_ops".into(),
                    table: "availability_slots".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "vault".into(),
                    table: "movements".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "vault".into(),
                    table: "reservations".into(),
                    tenant_id_column: "tenant_id".into(),
                },
                GdprTable {
                    schema: "vault".into(),
                    table: "warehouses".into(),
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