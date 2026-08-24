# Partner applications — drafts

Four drafts, ready to review and submit. **Nothing here has been sent.** Every
`[BRACKET]` is a decision or a fact only you can supply.

Before submitting any of them, settle two things:

1. **Which legal entity applies?** ICE, Blend, and Salesforce's ISV track all
   want a company on the other side — legal entity, EIN, usually a security
   questionnaire, sometimes insurance. Shape and a customer-owned Salesforce
   Connected App do not care. That is another reason the self-serve tier goes
   first: it does not stall on incorporation.
2. **Do you have a named design partner?** Every one of these applications is
   dramatically stronger with "we have a mutual customer ready to pilot" in it.
   Total Expert's own process requires one — production access happens "with one
   of our mutual clients". Without a named lender, TE and ICE both stall at the
   same place.

The shared positioning, which every draft below uses:

> ReadyIQ is a credit-readiness platform for the mortgage market. A loan officer
> sends one link to a lead who is not yet approvable. The consumer gets a private
> workspace to check all three bureaus, dispute possible errors, and build
> positive history. The loan officer sees **status only — never the credit
> report** — and gets a signal when the consumer is ready to talk again.
>
> The integration surface is a single derived status object: pathway, round,
> next milestone, review-requested flag. No score, no report, no tradelines. The
> receiving system never becomes a holder of consumer report data.

That last paragraph is the one that gets you through a partner security review.
Lead with it.

---

## 1. Total Expert — Technology Partner application

**Where:** https://info.totalexpert.com/become-partner-technology
**Cost:** free · **Gets you:** Developer Portal + CT sandbox credentials

> **Company:** [ENTITY]
> **Product:** ReadyIQ — credit-readiness platform for mortgage lenders
> **Website:** [URL]
> **Contact:** [NAME], [TITLE], [EMAIL]
>
> **What the integration does**
>
> ReadyIQ gives a lender's not-yet-approvable leads a private workspace to check
> all three bureaus, dispute possible errors, and build positive payment history.
> When a consumer crosses the lender's readiness threshold or asks to talk, that
> signal needs to reach the loan officer inside Total Expert rather than in
> another dashboard nobody logs into.
>
> **Intended use of the API**
>
> - **Contacts** — upsert the consumer, with `owner.external_id` set to the
>   originating loan officer so attribution is preserved.
> - **Surveys** — store each readiness status snapshot. We chose surveys over
>   custom fields specifically because custom fields require Total Expert to
>   create them per customer; surveys are self-service, repeatable, and usable
>   as Journey conditions.
> - **Insights** — fire milestone events (prefixed `ReadyIQ:` per your naming
>   convention) so lenders can drive Journeys off real readiness progress.
>
> We would want to coordinate on creating roughly ten insight types. The list
> and a survey definition are ready to send.
>
> **What we never send:** no credit score, no credit report, no tradelines, no
> dispute letters. Only derived status. The Total Expert instance never becomes
> a holder of consumer report data.
>
> **Auth:** authorization-code flow, so one credential set serves multiple mutual
> customers. We have implemented token caching against your documented limit of
> 2 token requests per hour per source IP.
>
> **Mutual customer for pilot:** [LENDER, or "in conversation — happy to start
> in CT while we finalise"]

---

## 2. ICE Mortgage Technology — Encompass partner enquiry

**Where:** ICE Mortgage Technology Partner Portal
**Cost:** partner agreement · **Note:** keys are issued per partner/lender pair,
and the lender's Encompass admin must complete their half

> **Company:** [ENTITY] · **Product:** ReadyIQ
> **Contact:** [NAME], [EMAIL]
>
> **Requested:** ISV partner API keys for Encompass Developer Connect.
>
> **Primary use case — inbound, not outbound.** ReadyIQ operates a consumer
> credit-readiness workspace outside the LOS. The capability we most need from
> Encompass is the **loan-created webhook event**. ReadyIQ has a feature called
> Protect Mode: once a borrower has a loan in process, we stop suggesting credit
> actions that could jeopardise the file — no new credit, no large payoffs, no
> disputes mid-underwriting — and we prompt the borrower to answer
> letter-of-explanation requests promptly.
>
> Protect Mode is only correct if we know a loan actually started. Today we ask
> the borrower. The Encompass `loan created` subscription is the accurate signal,
> and `loan funded` is how we turn it off.
>
> **Scopes requested**
>
> - Webhook subscriptions: `loan.created`, `loan.funded`, and
>   `loan.enhancedFieldChange` (narrowly scoped).
> - Loan pipeline read, used only to reconcile a missed notification.
>
> **Outbound to Encompass:** a derived readiness status object. No score, no
> report, no tradelines, no dispute letters — so no consumer report data is
> written into the lender's Encompass instance.
>
> **Lender:** [LENDER NAME], instance [ID]. Their Encompass administrator is
> ready to complete the partner enablement. [Or: "we are finalising our first
> lender and will return with an instance."]

---

## 3. Blend — partner enquiry

**Where:** https://blend.com/partner-with-us/
**Cost:** partner agreement · **Note:** no public developer portal, so this is a
conversation before it is an integration

> **Company:** [ENTITY] · **Product:** ReadyIQ · **Contact:** [NAME], [EMAIL]
>
> **The overlap:** Blend sees applications that stall because the borrower is not
> yet credit-ready. Those applications are not lost demand — they are early
> demand. ReadyIQ picks them up, gives the consumer a private workspace to
> improve, and returns them to the same lender and the same loan officer when
> they are ready.
>
> **What we would want**
>
> - An event when an application is paused or abandoned for credit reasons, so
>   the lender can offer ReadyIQ as the next step rather than nothing.
> - A way to write a readiness status back so the returning borrower is
>   recognised.
>
> **What we would send:** derived status only — pathway, round, next milestone,
> review-requested. Never a score or a report.
>
> **Asking for:** whether a partner API exists for this shape of integration, and
> what your partner onboarding requires. We are happy to start with a plain
> signed webhook if that is the faster path.

---

## 4. LenderHomePage — internal conversation, not a form

**Where:** direct. Rocky Foroutan (CEO), Kwe Parker (Sales & Marketing),
Nick Kornev (Engineering).

**Handle this one differently.** You started a 90-day role at LenderHomePage on
2026-08-19. A ReadyIQ↔LHP partnership should be raised openly and early rather
than assembled quietly — very likely welcome, but much cleaner as a conversation
than as a discovery. Raise it with Rocky before writing any integration code
against LHP, and before the other three applications name LHP as a design
partner.

Talking points, if and when it is appropriate:

- LHP sells websites, Loanzify POS, and an app to lenders with 10–300 LOs. That
  segment has the same problem ReadyIQ solves: leads arrive not-yet-approvable
  and the LO has nothing useful to give them.
- The integration is small on LHP's side: a link with attribution baked in on the
  front door, and a status webhook back. No LOS work, no credit data.
- There is no public LHP developer documentation, so scope would be defined from
  scratch — which also means it can be defined to be genuinely small.
- Until anything is agreed, LHP is reachable exactly like any other endpoint
  through the generic signed webhook. No special-casing required.

---

## 5. Shape — no application needed

Shape is self-serve. You need a Shape account; the key comes from
**Shape → API Integrations → Shape Open API**, and a system administrator can
enable access or share an existing key. Public docs at https://setshape.com/api-docs.

Put the key in a local `.env` as `SHAPE_API_KEY` and the connector in
`server/connectors/shape.js` runs against it immediately. This is the only one of
the six that can be live rather than mocked without anyone's permission.
