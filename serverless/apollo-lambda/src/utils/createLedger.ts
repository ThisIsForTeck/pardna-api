import add from "date-fns/add";
import eachDayOfInterval from "date-fns/eachDayOfInterval";
import eachWeekOfInterval from "date-fns/eachWeekOfInterval";
import eachMonthOfInterval from "date-fns/eachMonthOfInterval";
import { Ledger, Participant, PaymentType, PeriodType } from "../types";

const createLedger = (
  initialLedgerData: Ledger,
  participants: Participant[] = [],
  startDate: Date,
  duration: number = 12,
) => {
  let periodType: PeriodType;
  let dates: Date[];
  const { paymentFrequency = "MONTHLY" } = initialLedgerData;

  let addDuration;

  switch (paymentFrequency) {
    case "DAILY":
      addDuration = { days: duration };
      break;
    case "WEEKLY":
      addDuration = { weeks: duration };
      break;
    case "MONTHLY":
    default:
      addDuration = { months: duration };
      break;
  }

  const endDate = add(new Date(startDate), addDuration);

  // TODO: eachMonthOfInterval seems to return two dates in same month
  switch (paymentFrequency) {
    case "DAILY":
      periodType = PeriodType.DAY;
      dates = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });
      break;
    case "WEEKLY":
      periodType = PeriodType.WEEK;
      dates = eachWeekOfInterval({
        start: startDate,
        end: endDate,
      });
      break;
    case "MONTHLY":
    default:
      periodType = PeriodType.MONTH;
      dates = eachMonthOfInterval({
        start: startDate,
        end: endDate,
      });
      break;
  }

  const periodsCreate = [];

  for (let i = 1; i <= duration; i += 1) {
    periodsCreate.push({
      type: periodType,
      number: i,
      payments: {
        create:
          participants?.map(participant => ({
            type: PaymentType.CONTRIBUTION,
            dueDate: dates[i],
            participant: {
              connectOrCreate: {
                where: {
                  email: participant.email,
                },
                create: participant,
              },
            },
          })) || undefined,
      },
    });
  }

  return {
    ...initialLedgerData,
    periods: {
      create: periodsCreate,
    }, // TODO: generate payments based on participants
  };
};

export default createLedger;
