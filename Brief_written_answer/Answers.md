# Brief written answers

## Give a brief overview of a scalable architecture which would support this pipeline

I would use a modular architecture that separates document uploads, storage, processing, and retrieval.

The API would validate incoming files, store them in object storage such as Amazon S3, save their metadata in PostgreSQL, and enqueue processing jobs. Background workers would consume these jobs and handle document detection, text extraction, and OCR for scanned PDFs. Separating processing from the API would allow the worker pool to scale independently, particularly when OCR workloads increase.

The API would expose endpoints for retrieving document status and extracted text, while the frontend could poll for processing updates. A message queue would help absorb spikes in uploads and retries, logging and monitoring would help improve reliability.

My current implementation provides the core pipeline using FastAPI, SQLite, local file storage, and background tasks. For production, I would evolve it towards this architecture to support higher workloads, more reliable processing, and independent scaling of components.

## How would your design change if you needed to support plain text files?

I would add a TXT document type and implement a TXTExtractor using the existing extractor interface. The document detector and extractor registry would be extended to recognise and support the new format. The API, processing orchestration, storage model and frontend could fairly remain unchanged because the current design already uses a modular extractor design.

## How would your design change if the number of documents being uploaded went up 100x?

I would separate the API from the document-processing workload. The API would validate and store each upload, create a database record, and enqueue a processing job. A scalable pool of background workers would process documents independently, which allows worker capacity to increase as demand grows. A durable queue would help manage bursts and prevent the system from being overloaded.

Also, I would use object storage for uploaded files, PostgreSQL for metadata, and appropriate database indexes and connection pooling. I would also introduce limits on processing time, and retry failed jobs safely. Monitoring queue depth, processing latency, error rates, and resource usage helps me to decide when to scale workers, investigate failures, or optimise the system.
