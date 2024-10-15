import { io } from "socket.io-client";
import { apiSlice } from "../api/apiSlice";
import { messagesApi } from "../messages/messagesApi";

export const conversationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query({
      query: ({email}) =>
        `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=1&_limit=${process.env.REACT_APP_CONVERSATIONS_PER_PAGE}`,
      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        const socket = io("http://localhost:9000", {
          reconnectionDelay: 1000,
          reconnection: true,
          reconnectionAttemps: 10,
          transports: ["websocket"],
          agent: false,
          upgrade: false,
          rejectUnauthorized: false,
        });

        try {
          await cacheDataLoaded;
          socket.on("conversation", (data) => {
            updateCachedData((draft) => {
              const conversation = draft.find((c) => c.id == data.data.id);
              if (conversation?.id) {
                conversation.message = data?.data?.message;
                conversation.timestamp = data?.data?.timestamp;
              } else {
                // do nothing
                // console.log("I am here", data);
                draft.push(data.data)
              }
            });
          });
        } catch (error) {
          await cacheEntryRemoved;
          socket.close();
        }
      },
    }),
    // getConversation: builder.query({
    //   query: ({ userEmail, participantEmail }) =>
    //     `/conversations?participants_like=${userEmail}-${participantEmail}&&participants_like=${participantEmail}-${userEmail}`,
    // }),
    getConversation: builder.query({
      query: ({ userEmail, participantEmail }) =>
        `/conversations?participants=${userEmail}-${participantEmail}&participants=${participantEmail}-${userEmail}`,
    }),
    addConversation: builder.mutation({
      query: ({ senderUser, data }) => ({
        url: "/conversations",
        method: "POST",
        body: data,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        // const patchResult = dispatch(
        //   apiSlice.util.updateQueryData(
        //     "getConversations",
        //     arg.senderUser,
        //     (draft) => {
        //       draft.push({id: draft.length + 1, ...arg.data});
        //     }
        //   )
        // );

        const conversation = await queryFulfilled;
        if (conversation?.data?.id) {
          const users = arg.data.users;
          const sender = users.find((user) => user.email === arg.senderUser);
          const receiver = users.find((user) => user.email !== arg.senderUser);

          const res = await dispatch(
            messagesApi.endpoints.addMessage.initiate({
              conversationId: conversation?.data?.id,
              sender,
              receiver,
              message: arg.data.message,
              timestamp: arg.data.timestamp,
            })
          ).unwrap();

          dispatch(
            apiSlice.util.updateQueryData(
              "getConversations",
              arg.senderUser,
              (draft) => {
                draft.push({ id: res.conversationId, ...arg.data });
              }
            )
          );

          // const res = await  dispatch(
          //     messagesApi.endpoints.addMessage.initiate({
          //       conversationId: conversation?.data?.id,
          //       sender,
          //       receiver,
          //       message: arg.data.message,
          //       timestamp: arg.data.timestamp,
          //     })
          //   ).unwrap();

          //   dispatch(
          //     apiSlice.util.updateQueryData(
          //       "getMessages",
          //       res.conversationId.toString(),
          //       (draft) => {
          //         draft.push(res)
          //       }
          //     )
          //   );
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
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getConversations",
            arg.senderUser,
            (draft) => {
              // eslint-disable-next-line eqeqeq
              const draftConversation = draft.find((c) => c.id == arg.id);

              draftConversation.message = arg.data.message;
              draftConversation.timestamp = arg.data.timestamp;
            }
          )
        );

        try {
          const conversation = await queryFulfilled;
          if (conversation?.data?.id) {
            const users = arg.data.users;
            const sender = users.find((user) => user.email === arg.senderUser);
            const receiver = users.find(
              (user) => user.email !== arg.senderUser
            );
            const res = await dispatch(
              messagesApi.endpoints.addMessage.initiate({
                conversationId: conversation?.data?.id,
                sender,
                receiver,
                message: arg.data.message,
                timestamp: arg.data.timestamp,
              })
            ).unwrap();

            dispatch(
              apiSlice.util.updateQueryData(
                "getMessages",
                res.conversationId.toString(),
                (draft) => {
                  draft.push(res);
                }
              )
            );
          }
        } catch (error) {
          patchResult.undo();
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
