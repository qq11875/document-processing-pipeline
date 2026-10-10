class UnsupportedFileTypeError(Exception):
    """Raised when the file type is not supported for extraction."""
    pass

class ExtractionError(Exception):
    """Raised when an error occurs during the extraction process."""
    pass

class NoTextExtractedError(Exception):
    """Raised when no text is extracted from the document."""
    pass