use crate::errors::SondError;
use crate::form::Form;
use crate::response::Response;
use uuid::Uuid;

pub trait SondRepository {
    fn get_form(&self, form_id: Uuid) -> Result<Option<Form>, SondError>;
    fn save_form(&self, form: &Form) -> Result<(), SondError>;
    fn get_response(&self, response_id: Uuid) -> Result<Option<Response>, SondError>;
    fn save_response(&self, response: &Response) -> Result<(), SondError>;
}
