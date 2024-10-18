import { useDispatch, useSelector } from "react-redux";
import {
  conversationsApi,
  useGetConversationsQuery,
} from "../../features/conversations/conversationsApi";
import ChatItem from "./ChatItem";
import Error from "../ui/Error";
import moment from "moment";
import getPartnerInfo from "../../utils/getPartnerInfo";
import gravatarUrl from "gravatar-url";
import { Link } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect, useState } from "react";

export default function ChatItems() {
  const { user } = useSelector((state) => state.auth) || {};
  const { email } = user || {};
  const { data, isLoading, isError, error } = useGetConversationsQuery({
    email,
  });

  const { data: conversations, totalCount } = data || {};
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dispatch = useDispatch();

  const fetchMore = () => {
    setPage((prevPage) => prevPage + 1);
  };

  useEffect(() => {
    if (page > 1) {
      dispatch(
        conversationsApi.endpoints.getMoreConversations.initiate({
          email,
          page,
        })
      );
    }
  }, [page, email, dispatch]);

  useEffect(() => {
    if (totalCount > 0) {
      const more =
        Math.ceil(
          totalCount / Number(process.env.REACT_APP_CONVERSATIONS_PER_PAGE)
        ) > page;

      setHasMore(more);
    }
  }, [totalCount, page]);

  let content = null;

  if (isLoading) {
    content = <li className="mt-1 text-center">Loading.....</li>;
  } else if (!isLoading && isError) {
    content = (
      <li className="mt-1 text-center">
        <Error message={error?.data} />
      </li>
    );
  } else if (!isLoading && !isError && conversations?.length === 0) {
    content = <li className="mt-1 text-center">No conversations found!</li>;
  } else if (!isLoading && !isError && conversations?.length > 0) {
    content = (
      <InfiniteScroll
        dataLength={conversations?.length}
        next={fetchMore}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        height={window.innerHeight - 129}
      >
        {conversations.map((conversation) => {
          const { id, message, timestamp, users } = conversation;
          const { name, email: partnerEmail } = getPartnerInfo(users, email);
          return (
            <li key={id}>
              <Link to={`/inbox/${id}`}>
                <ChatItem
                  avatar={gravatarUrl(partnerEmail, {
                    size: 80,
                  })}
                  name={name}
                  lastMessage={message}
                  lastTime={moment(timestamp).fromNow()}
                />
              </Link>
            </li>
          );
        })}
      </InfiniteScroll>
    );
  }

  return <ul>{content}</ul>;
}
