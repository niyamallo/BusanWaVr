import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useParams } from "react-router";
import moment from "moment";
import CalendarTour from "../../blocks/CalendarTour";
import "./GuideCalendar.css";

const UserCalendar = () => {
  const { urlId } = useParams();
  const [value, onChange] = useState(new Date());
  const [scheduledTours, setScheduledTours] = useState([]);
  const [mark, setMark] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://busanwavrserver.store/guide/${urlId}/tour/schedule`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (response.status === 200) {
          const data = await response.json();
          setScheduledTours(data.data.scheduledTours);

          const tourDates = data.data.scheduledTours.map((item) =>
            moment(item.startDate).utcOffset(9).format("YYYY-MM-DD")
          );
          setMark(tourDates);
        } else {
          toast.error(
            "투어데이터를 받아올 수 없습니다. 잠시 후 다시 시도해 주세요."
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const tour = scheduledTours.find(
      (item) =>
        moment(item.startDate).utcOffset(9).format("YYYY-MM-DD") ==
        moment(value).format("YYYY-MM-DD")
    );

    console.log(tour);

    if (tour) {
      setSelectedTour(tour);
    } else {
      setSelectedTour(null);
    }
    setSelectedDate(moment(value).format("YYYY-MM-DD"));
  }, [value]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}
    >
      <Calendar
        onChange={onChange} // useState로 포커스 변경 시 현재 날짜 받아오기
        formatDay={(locale, date) => moment(date).format("DD")} // 날'일' 제외하고 숫자만 보이도록 설정
        value={value}
        minDetail="month" // 상단 네비게이션에서 '월' 단위만 보이게 설정
        maxDetail="month" // 상단 네비게이션에서 '월' 단위만 보이게 설정
        navigationLabel={null}
        showNeighboringMonth={true}
        className="w-full md:w-3/5 mb-4 md:m-0"
        tileContent={({ date, view }) => {
          let html = [];
          if (mark.find((x) => x === moment(date).format("YYYY-MM-DD"))) {
            html.push(<div className="dot"></div>);
          }
          return (
            <div className="flex justify-center items-center absoluteDiv">
              {html}
            </div>
          );
        }}
      />
      <div className="w-full md:w-2/5 md:pl-6 mb-4 md:m-0">
        <CalendarTour selectedTour={selectedTour} />
      </div>
    </div>
  );
};

export default UserCalendar;
