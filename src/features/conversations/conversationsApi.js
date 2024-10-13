import { apiSlice } from "../api/apiSlice";
import { messagesApi } from "../messages/messagesApi";

export const conversationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query({
      query: (email) =>
        `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=1&_limit=${process.env.REACT_APP_CONVERSATIONS_PER_PAGE}`,
    }),
    getConversation: builder.query({
      query: ({ userEmail, participantEmail }) =>
        `/conversations?participants_like=${userEmail}-${participantEmail}&&participants_like=${participantEmail}-${userEmail}`,
    }),
    addConversation: builder.mutation({
      query: ({ senderUser, data }) => ({
        url: "/conversations",
        method: "POST",
        body: data,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        const conversation = await queryFulfilled;
        if (conversation?.data?.id) {
          const users = arg.data.users;
          const sender = users.find((user) => user.email === arg.senderUser);
          const receiver = users.find(
            (user) => user.email !== arg.senderUser
          );
          dispatch(
            messagesApi.endpoints.addMessage.initiate({
              conversationId: conversation?.data?.id,
              sender,
              receiver,
              message: arg.data.message,
              timestamp: arg.data.timestamp
            })
          );
        }
      },
    }),
    editConversation: builder.mutation({
      query: ({ id, senderUser, data }) => ({
        url: `/conversations/${id}`,
        method: "PATCH",
        body: data,
      }),


      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        const conversation = await queryFulfilled;
        if (conversation?.data?.id) {
          const users = arg.data.users;
          const sender = users.find((user) => user.email === arg.senderUser);
          const receiver = users.find(
            (user) => user.email !== arg.senderUser
          );
          dispatch(
            messagesApi.endpoints.addMessage.initiate({
              conversationId: conversation?.data?.id,
              sender,
              receiver,
              message: arg.data.message,
              timestamp: arg.data.timestamp
            })
          );
        }
      },


    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useAddConversationMutation,
  useEditConversationMutation,
} = conversationsApi;
