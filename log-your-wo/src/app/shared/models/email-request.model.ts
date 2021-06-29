export class EmailRequest {
    constructor(
        public fromEmailAddress?: string,
        public toEmailAddress?: string,
        public subject?: string,
        public attachments?: Array<string>,
        public body?: string,
        public date?: string
    ) { }
}