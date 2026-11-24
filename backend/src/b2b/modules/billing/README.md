# billing — SaaS invoices, collection, dunning (Stage 13)

Rating engine (`domain/rating.js`, pure), SaaS GST invoices in their own series (`S2627DL000001`), collection from the client wallet (op `saas:<invoice>`), PayU for what the wallet could not cover, month-close overage. Dunning in `dunning.service.js`.
