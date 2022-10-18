export interface MessageCard {
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  themeColor: string,
  summary: string,
  sections: Section[],
  potentialAction?: PotentialAction[]
}

interface Section {
  activityTitle: string,
  activitySubtitle: string,
  activityImage?: string,
  activityText?: string
  facts: Fact[],
  markdown: boolean
}

interface Fact {
  name: string,
  value: string
}

interface PotentialAction {
  "@type": "ActionCard",
  name: string,
  inputs: Input[],
  actions: HttpPostAction[]
}
interface Input {
  "@type": "TextInput",
  id: string,
  isMultiline: boolean,
  title: string 
}

interface HttpPostAction {
  "@type": "HttpPOST",
  name: string,
  target: string
}

export interface IncomingWebhookResult {
  text: string;
}