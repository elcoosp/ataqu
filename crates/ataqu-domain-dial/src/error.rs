use thiserror::Error;

/// Errors that can occur in the DIAL domain.
#[derive(Debug, Error)]
pub enum DialError {
    #[error("channel name cannot be empty")]
    EmptyChannelName,

    #[error("channel name exceeds maximum length of {max} characters")]
    ChannelNameTooLong { max: usize },

    #[error("message content cannot be empty")]
    EmptyMessageContent,

    #[error("message content exceeds maximum length of {max} characters")]
    MessageContentTooLong { max: usize },

    #[error("channel is already archived")]
    ChannelAlreadyArchived,

    #[error("cannot send message to an archived channel")]
    ChannelIsArchived,

    #[error("direct message channel must have exactly 2 participants, got {count}")]
    InvalidDmParticipantCount { count: usize },

    #[error("only the message author can edit their message")]
    NotMessageAuthor,

    #[error("thread parent message not found in the specified channel")]
    ThreadParentNotFound,

    #[error("repository error: {0}")]
    Repository(String),

    #[error("presence store error: {0}")]
    Presence(String),
}
